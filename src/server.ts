import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false };
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting;
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

export const client = new Client(dbConfig);
client.connect();

// interfaces
export interface Comments {
  resource_id: number,
  author_id: number,
  comment_text: string,
  //unsure of type here
  date_added?: string
}

//get all resources
app.get("/resources", async (req, res) => {
  const dbres = await client.query("SELECT * FROM resources");
  res.status(200).json({
    status: "success",
    message: "Retrieved bee-sources",
    data: dbres.rows,
  });
});

//get specific resource
app.get<{ id: number }>("/resources/:id", async (req, res) => {
  const { id } = req.params;
  const dbres = await client.query("SELECT * FROM resources WHERE id = $1", [
    id,
  ]);
  res.status(200).json({
    status: "success",
    message: "Retrieved one bee-source",
    data: dbres.rows,
  });
});

//get all tags
app.get("/tags", async (req, res) => {
  //do we need just tag name?
  const dbres = await client.query("SELECT * FROM tags");
  res.status(200).json({
    status: "success",
    message: "Retrieved all tags",
    data: dbres.rows,
  });
});

//get specified tag
app.get<{ id: number }>("/tags/:id", async (req, res) => {
  const { id } = req.params;
  const dbres = await client.query("SELECT * FROM tags WHERE tag_id = $1", [
    id,
  ]);
  res.status(200).json({
    status: "success",
    message: "Retrieved one tag",
    data: dbres.rows,
  });
});

//get all tags associated with a specified resource
app.get<{ id: number }>("/resources/:id/tags", async (req, res) => {
  const { id } = req.params;
  const dbres = await client.query(
    "SELECT * FROM tags INNER JOIN resource_tags ON tags.tag_id = resource_tags.tag_id WHERE resource_tags.resource_id = $1",
    [id]
  );
  res.status(200).json({
    status: "success",
    message: "Retrieved all tags for a single resource",
    data: dbres.rows,
  });
});

//add a new tag when it doesn't already exist
app.post("/tags", async (req, res) => {
  const { tag } = req.body;
  const tagExists = await client.query(
    "SELECT * FROM tags WHERE tag_name = $1",
    [tag]
  );
  if (tagExists.rowCount === 0) {
    const dbres = await client.query(
      "INSERT INTO tags (tag_name) VALUES ($1) RETURNING *",
      [tag]
    );
    res.status(200).json({
      status: "success",
      message: "Added a new tag",
      data: dbres.rows,
    });
  } else {
    res.status(200).json({
      status: "success",
      message: "Tag already exists",
      data: tagExists.rows,
    });
  }
});

//get the comments to an associated resource
app.get<{ id: number }>("/resources/:id/comments", async (req, res) => {
  const { id } = req.params;
  const dbres = await client.query(
    "SELECT * FROM resources INNER JOIN comments ON resources.id = comments.resource_id WHERE resources.id = $1",
    [id]
  );
  res.status(200).json({
    status: "success",
    message: "Retrieved all comments for a single resource",
    data: dbres.rows,
  });
});


//add a new comment associated with a resource
app.post<{}, {}, Comments>("/comments", async (req, res) => {
  //will date remain default? 
  const { resource_id, author_id, comment_text } = req.body;
  const dbres = await client.query(
    "INSERT INTO comments (resource_id, author_id, comment_text) VALUES ($1, $2, $3) RETURNING *",
    [resource_id, author_id, comment_text]
  );
  res.status(200).json({
    status: "success",
    message: "Added a new comment",
    data: dbres.rows,
  });
});

//get the study list resources for an associated user
app.get<{ user_id: number }>("/study_list/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const dbres = await client.query(
    "SELECT * FROM users\
    JOIN study_list ON users.id = study_list.user_id\
    JOIN resources ON resources.id = study_list.resource_id\
    WHERE users.id = $1",
    [user_id]
  );
  res.status(200).json({
    status: "success",
    message: "Retrieved all study list resources for a user",
    data: dbres.rows,
  });
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
export const server = app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});

export default app;
