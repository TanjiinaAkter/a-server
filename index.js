const express = require("express");
const app = express();
const port = process.env.PORT | 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// config file er secret key use korte hole obossoi age dite hobe process.env.key gular
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
// payment er kaj --1
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
console.log(stripe);
//middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// MONGODB STARTS

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hpnxgzg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // ==========================================================//
    //                 JWT WEB TOKEN
    // ==========================================================//

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      console.log(token);
      res.send({ token });
    });
    // ==========================================================//
    //               VERIFY TOKEN
    // ==========================================================//
    const verifyToken = (req, res, next) => {
      console.log("header auth", req.headers.authorization);

      const token = req.headers.authorization.split(" ")[1];

      console.log("hi token", token);
      if (!req.headers.authorization) {
        return res
          .status(401)
          .send({ message: "forbidden access, token pai nai" });
      }

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res
            .status(401)
            .send({ message: "forbidden access because of err" });
        }

        req.decoded = decoded;
        next();
      });
    };

    // ==========================================================//
    //                   DATABASE ER KAJ STARTS //
    // ==========================================================//
    const database = client.db("a-server");
    const usersCollection = database.collection("users");
    const allproductsCollection = database.collection("allproducts");
    const cartsCollection = database.collection("carts");
    const wishlistCollection = database.collection("wishlist");
    const checkoutInfoCollection = database.collection("checkoutinfo");
    const paymentsCollection = database.collection("payments");
    const reviewCollection = database.collection("reviews");
    const dealsCollection = database.collection("deals");
    // ==========================================================//
    //                  USER COLLECTION
    // ==========================================================//

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // ==========================================================//
    //                  AlLL PRODUCTS COLLECTION
    // ==========================================================//

    app.post("/allproducts", verifyToken, async (req, res) => {
      const products = req.body;
      const result = await allproductsCollection.insertOne(products);
      res.send(result);
    });

    app.get("/allproducts", async (req, res) => {
      const result = await allproductsCollection.find().toArray();
      res.send(result);
    });

    app.get("/allproducts/DropDown", async (req, res) => {
      const {
        topCategory,
        thirdCategory,
        sort,
        size,
        color,
        // availability,
        priceRange,
        discountRange,
      } = req.query;

      if (!topCategory || !thirdCategory) {
        return res
          .status(400)
          .json({ error: "Missing required query parameters" });
      }
      // query diye find korle full details pabo
      const query = {
        topCategory,
        thirdCategory,
      };
      // ================ SIZE FILTERING============= //

      // size amra client side theke "S",'M' evabe pacchi seta /allproducts/DropDown route er query te send kore dicchi  , so amra server e age array te convert kore nicchi karon client e amrader size gulo alada alada s, m, l amn ache,,,  then mongodb $or query diye cindition set korchi jate value mille peye jai,, prottekta k new $or array te push kore dicchi, seta amader product er sathe match hole .finde r maddhome result pacchi
      if (size) {
        const sizeArray = size.split(",");
        query.$or = []; // Initialize $or array for size filtering

        // Loop through the size values and check against individual size fields
        sizeArray.forEach((sizecheck) => {
          query.$or.push({
            $or: [
              { sizenamelarge: sizecheck },
              { sizenamemedium: sizecheck },
              { sizenamesmall: sizecheck },
            ],
          });
        });
      }
      // ================ COLOR FILTERING============= //
      // jehetu color ekta jey e ache so $in use korlei hobe
      if (color) {
        query.color = { $in: color.split(",") };
      }
      // if (availability) {
      //   query.availability = availability === "in stock";
      // }
      //split er kaj alada kora like priceRange =100-500, alada kore ["100", "500"] emn hobe then seta ke number e convert kore feltese [100,500]
      // ekhane split("-") use korechi karon amader pawa value 100-500, jodi amader value ta 100/500 hoto tahole amra split('/') evabe ditam

      //$gte == greater than or equal
      //$lte = less than or equal
      if (priceRange) {
        const [minPrice, maxPrice] = priceRange.split("-").map(Number);
        query.price = { $gte: minPrice, $lte: maxPrice };
      }

      // Handling discountRange (ensuring "%" is removed properly)
      if (discountRange) {
        // Remove "%" sign at the end and split the range
        const [minDiscount, maxDiscount] = discountRange
          .replace("%", "") // Remove the "%" sign
          .split("-") // Split by the hyphen
          .map(Number); // Convert the strings to numbers

        query.discountedPercentage = { $gte: minDiscount, $lte: maxDiscount }; // Query with the discount range
      }
      let sortOption = {};
      if (sort === "high-to-low") {
        sortOption.price = -1;
      }
      if (sort === "low-to-high") {
        sortOption.price = 1;
      }
      const result = await allproductsCollection
        .find(query)
        .sort(sortOption)
        .toArray();
      res.send(result);
    });
    // ==========================================================//
    //                  CARTS COLLECTION
    // ==========================================================//
    // ========= cart e item post kora for all users ==========//
    app.post("/carts", async (req, res) => {
      const cartData = req.body;
      const result = await cartsCollection.insertOne(cartData);
      res.send(result);
    });
    // ========= cart e item get kora for all users ==========//
    app.get("/carts", async (req, res) => {
      const result = await cartsCollection.find().toArray();
      res.send(result);
    });
    // ========= cart er item pawa  for single user ==========//
    app.get("/carts/single", async (req, res) => {
      const { email, id } = req.query;
      const filter = id ? { _id: new ObjectId(id) } : { email };
      const result = await cartsCollection.find(filter).toArray();
      res.send(result);
    });
    // ========= cart er item id diye edit kora for single user ==========//
    app.patch("/carts/single/:id", async (req, res) => {
      //kon item update korte chai ar sei item er ki ki update hobe seta set kore dite hobe
      const { quantity, itemPrice, color, size } = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          quantity,
          itemPrice,
          color,
          size,
        },
      };
      console.log("lets update", updatedDoc);
      const result = await cartsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // ========= cart e item delete kora for all users ==========//
    app.delete("/carts/single/:id", async (req, res) => {
      const getId = req.params.id;
      const query = { _id: new ObjectId(getId) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });
    // ==========================================================//
    //                  WISHLIST COLLECTION
    // ==========================================================//
    app.post("/wishlist", async (req, res) => {
      const getData = req.body;
      const result = await wishlistCollection.insertOne(getData);
      res.send(result);
    });
    app.get("/wishlist", async (req, res) => {
      const result = await wishlistCollection.find().toArray();
      res.send(result);
    });

    app.get("/wishlist/userwishlist", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/wishlist/userwishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });
    // ==========================================================//
    //                  CHECKOUT INFORMATION COLLECTION
    // ==========================================================//

    app.post("/checkoutinfo", async (req, res) => {
      const getData = req.body;
      const result = await checkoutInfoCollection.insertOne(getData);
      res.send(result);
    });
    app.get("/checkoutinfo", async (req, res) => {
      const result = await checkoutInfoCollection.find().toArray();
      res.send(result);
    });

    // ==========================================================//
    //                 PAYMENT INTENT ER KAJ STARTS //
    // ==========================================================//
    app.post("/create-payment-intent", async (req, res) => {
      const { totalPrice } = req.body;
      if (!totalPrice || totalPrice <= 0) {
        return res.status(400).send({ error: "Invalid totalPrice value" });
      }
      console.log("Received totalPrice:", totalPrice);
      // poysha te hishab kore tai amra 100 diye gun kore dicchi
      const amount = parseFloat(totalPrice * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // ==========================================================//
    //  PAYMENT lists saved IN DATABASE... payment btn e click korar sathe sathe delete kore felte hobe cart item gulo k cart theke//
    // ==========================================================//

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log("hi ", payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartsCollection.deleteMany(query);
      const result = await paymentsCollection.insertOne(payment);
      res.send({
        result,
        deleteResult,
      });
    });

    app.get("/payments", async (req, res) => {
      const result = await paymentsCollection.find().toArray();
      res.send(result);
    });
    app.get("/payments/single", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    });

    // ==========================================================//
    //               PRODUCT   REVIEW  COLLECTION
    // ==========================================================//
    app.post("/reviews", async (req, res) => {
      const getData = req.body;
      const result = await reviewCollection.insertOne(getData);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews/single", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email: email };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // ==========================================================//
    //               DEALS COLLECTION
    // ==========================================================//

    app.get("/deals", async (req, res) => {
      const result = await dealsCollection.find().toArray();
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("a-10 server is working fine!");
});

app.listen(port, () => {
  console.log(`a-10 server app listening on port ${port}`);
});
