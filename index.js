const express = require("express");
const app = express();
const port = process.env.PORT | 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
//middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
require("dotenv").config();
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

    // ==========================================================//
    //                  CARTS COLLECTION
    // ==========================================================//
    app.post("/carts", async (req, res) => {
      const cartData = req.body;
      const result = await cartsCollection.insertOne(cartData);
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      //email field diye specific email ta khujtesi
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    // app.get("/carts", async (req, res) => {
    //   const result = await cartsCollection.find().toArray();
    //   res.send(result);
    // });
    // app.get("/carts", async (req, res) => {
    //   const result = await cartsCollection.find().toArray();
    //   res.send(result);
    // });
    // app.get("/carts/single", async (req, res) => {
    //   const email = req.query.email;
    //   const query = { email: email };
    //   const result = await cartsCollection.find(query).toArray();
    //   res.send(result);
    // });
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
