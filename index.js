const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 1000;
const app = express();
const jwt = require("jsonwebtoken");


// middleware
app.use(cors());
app.use(express.json());

// variable
const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const secret = process.env.ACCESS_TOKEN;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${user}:${password}@cluster0.nvx6pod.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
    // console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, secret, function (err, decoded) {
    if (err) {
      // console.log(err);
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const usersCollection = client.db("dayDiary").collection("users");
    const storiesCollection = client.db("dayDiary").collection("stories");

       const verifyAdmin = async (req, res, next) => {
         const decodedEmail = req.decoded.email;
           const query = { email: decodedEmail };
        //    console.log(query);
           const user = await usersCollection.findOne(query);
        //    console.log(user);
         if (user?.user_type !== "Admin") {
           return res.status(403).send({ message: "forbidden access.." });
         }
         next();
       };

    //* JWT
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      //   console.log(user);
      if (user) {
        const token = jwt.sign({ email }, secret, { expiresIn: "7d" });
        return res.send({ accessToken: token });
      }
      return res.status(403).send({ accessToken: "" });
    });

    //* Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      //   console.log(user);
      const filter = { email: user.email };
      const email = await usersCollection.findOne(filter);
      if (email) {
        res.send({ message: "Already have account wth this email." });
      } else {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }
    });

    app.post('/addStory', verifyJWT, async (req, res) => {
      const story = req.body
      const result = await storiesCollection.insertOne(story);
      res.send(result)
    })

    app.get('/stories', verifyJWT, async (req, res) => {
      const email=req.query.mail
      const query = { writer_email :email};
      const stories = await storiesCollection
        .find(query)
        .sort({ post_time: -1 })
        .toArray();
      // console.log(stories);
      console.log(email);
      res.send(stories);
    })

    app.delete('/stories', verifyJWT, async (req, res) => {
      const id = req.query.id;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const result = await storiesCollection.deleteOne(filter);
      res.send(result)
    })

    app.patch('/updateStory/:id', verifyJWT, async (req, res) => {
      const id=req.params.id
      const story = req.body;
      const query = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          image: story.image,
          title: story.title,
          writer_story: story.writer_story

        },
      };
      const result = await storiesCollection.updateOne(query, updatedDoc);
      res.send(result)
    })

  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Day Diary is running");
});

app.listen(port, () => {
  console.log("Day Diary running on", port);
});
