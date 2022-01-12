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
// const herokuSSLSetting = { rejectUnauthorized: false };
// const sslSetting = process.env.LOCAL ? false : herokuSSLSetting;
const dbConfig = process.env.LOCAL
  ? { database: `${process.env.LOCAL_DB}` }
  : {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

export const client = new Client(dbConfig);
client.connect();

// interfaces
export interface Comments {
  resource_id: number;
  author_id: number;
  comment_text: string;
}

export interface StudyList {
  resource_id: number;
  user_id: number;
  studied: boolean;
}

export interface Resource {
  author_id: number;
  title: string;
  description: string;
  recommended: string;
  url: string;
}

// get all resources
app.get("/resources", async (req, res) => {
  const dbres = await client.query(
    "SELECT r.*, u.name, u.is_faculty, CAST(COALESCE(l.like_count, 0) AS INT) likes,\
    CAST(COALESCE(d.dislike_count, 0) AS INT) dislikes\
    FROM (SELECT resource_id, COUNT(*) like_count FROM likes WHERE liked = true GROUP BY resource_id) l\
    RIGHT JOIN resources r ON r.id = l.resource_id\
    LEFT JOIN (SELECT resource_id, COUNT(*) dislike_count FROM likes WHERE liked = false GROUP BY resource_id) d ON r.id = d.resource_id\
    JOIN users u ON u.id = r.author_id\
    ORDER BY date_added DESC;"
  );
  res.status(200).json({
    status: "success",
    message: "Retrieved bee-sources",
    data: dbres.rows,
  });
});

// get specific resource with id
app.get<{ id: number }>("/resources/:id", async (req, res) => {
  const { id } = req.params;
  const dbres = await client.query(
    "SELECT r.*, u.name, u.is_faculty, CAST(COALESCE(l.like_count, 0) AS INT) likes,\
    CAST(COALESCE(d.dislike_count, 0) AS INT) dislikes\
    FROM (SELECT resource_id, COUNT(*) like_count FROM likes WHERE liked = true GROUP BY resource_id) l\
    RIGHT JOIN resources r ON r.id = l.resource_id\
    LEFT JOIN (SELECT resource_id, COUNT(*) dislike_count FROM likes WHERE liked = false GROUP BY resource_id) d ON r.id = d.resource_id\
    JOIN users u ON u.id = r.author_id\
    WHERE r.id = $1",
    [id]
  );
  res.status(200).json({
    status: "success",
    message: "Retrieved one bee-source",
    data: dbres.rows[0],
  });
});

// get all users
app.get("/users", async (req, res) => {
  const dbres = await client.query("SELECT * FROM users");
  res.status(200).json({
    status: "success",
    message: "Retrieved all users",
    data: dbres.rows,
  });
});

// get all tags
app.get("/tags", async (req, res) => {
  //do we need just tag name?
  const dbres = await client.query("SELECT * FROM tags");
  res.status(200).json({
    status: "success",
    message: "Retrieved all tags",
    data: dbres.rows,
  });
});
// get a tag with tag_id
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

// get all tags associated with a specific resource
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

// get all comments to an associated resource
app.get<{ id: number }>("/resources/:id/comments", async (req, res) => {
  const { id } = req.params;
  const dbres = await client.query(
    "SELECT comments.*, users.name FROM resources\
    INNER JOIN comments ON resources.id = comments.resource_id\
    INNER JOIN users ON users.id = comments.author_id\
    WHERE resources.id = $1\
    ORDER BY comments.date_added DESC",
    [id]
  );
  res.status(200).json({
    status: "success",
    message: "Retrieved all comments for a single resource",
    data: dbres.rows,
  });
});

// get the study list resources for an associated user
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

// update the studied status of a specific resource in a specific user's study list
app.put<{}, {}, StudyList>("/study_list/update", async (req, res) => {
  //when do we use req.body and when to use req.params
  const { user_id, resource_id, studied } = req.body;
  const dbres = await client.query(
    "UPDATE study_list SET studied = $1 WHERE user_id = $2 and resource_id = $3 RETURNING *",
    [studied, user_id, resource_id]
    //how come the to_study default is set to false in the study_list table?
  );
  res.status(200).json({
    status: "success",
    message:
      "Updated the to_study status of a specific resource in a specific user's study list",
    data: dbres.rows,
  });
});

//update the to_study status of a specific resource in a specific user's study list [IN DEVELOPMENT]
// app.put<{}, {}, Resource>("/resources/update", async (req, res) => {
//   const { title, description, recommended, url } = req.body;
//   const dbres = await client.query(
//     "UPDATE resources SET title=$1, description=$2, recommended=$3, url=$4 WHERE id=$5 RETURNING *",
//     [title, description, recommended, url]
//   );
//   res.status(200).json({
//     status: "success",
//     message:
//       "Updated the to_study status of a specific resource in a specific user's study list",
//     data: dbres.rows,
//   });
// });

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
    res.status(201).json({
      status: "success",
      message: "Added a new tag",
      data: dbres.rows,
    });
  } else {
    res.status(409).json({
      //or 500?
      status: "fail",
      message: "Tag already exists",
      data: tagExists.rows,
    });
  }
});

//add a new comment associated with a resource
app.post<{}, {}, Comments>("/comments", async (req, res) => {
  const { resource_id, author_id, comment_text } = req.body;
  const dbres = await client.query(
    "INSERT INTO comments (resource_id, author_id, comment_text) VALUES ($1, $2, $3) RETURNING *",
    [resource_id, author_id, comment_text]
  );
  res.status(201).json({
    status: "success",
    message: "Added a new comment",
    data: dbres.rows,
  });
});

//add a resource to the study list of a specific user
app.post<{}, {}, StudyList>("/study_list", async (req, res) => {
  //when do we use req.body and when to use req.params?
  //need to alter the front-end so that you can't add a specific resource to a study list more than once
  const { user_id, resource_id, studied } = req.body;
  const dbres = await client.query(
    "INSERT INTO study_list (user_id, resource_id, to_study) VALUES ($1, $2, $3) RETURNING *",
    [user_id, resource_id, studied]
    //how come the to_study default is set to false in the study_list table?
  );
  res.status(201).json({
    status: "success",
    message: "Added a resource to the study list of a specific user",
    data: dbres.rows,
  });
});

// add an entry into likes table to like or dislike
app.post<{ id: number }, {}, { user_id: number; liked: boolean }>(
  "/resources/:id/likes",
  async (req, res) => {
    const { id } = req.params;
    const { user_id, liked } = req.body;
    const dbres = await client.query(
      "INSERT INTO likes (author_id, resource_id, liked) VALUES ($1, $2, $3)",
      [user_id, id, liked]
    );
    res.status(200).json({
      status: "success",
      message: "Updated the number of likes for a spific resource",
      data: {
        resource_id: id,
        user_id,
      },
    });
  }
);

//add a new resource
app.post<{}, {}, Resource>("/add_resource", async (req, res) => {
  //should date_added be default? how does date work in SQL? Can we use CURRENTDATE as default type?
  //change liked to default 0
  const { author_id, title, description, recommended, url } = req.body;
  const dbres = await client.query(
    "INSERT INTO resources (author_id, title, description, recommended, url, likes) VALUES\
    ($1, $2, $3,$4, $5, $6) RETURNING *",
    [author_id, title, description, recommended, url]
  );
  res.status(201).json({
    status: "success",
    message: "Added a new resource",
    data: dbres.rows,
  });
});

//associates an existing tag to a resource
app.post<{ id: number }, {}, { tag_ids: number[] }>(
  "/resources/:id/tags",
  async (req, res) => {
    const { id } = req.params;
    const { tag_ids } = req.body;
    console.log("type of tag_ids", typeof tag_ids);
    for (const tag_id of tag_ids) {
      await client.query(
        "INSERT INTO resource_tags (tag_id, resource_id) VALUES ($1, $2)",
        [tag_id, id]
      );
    }
    const dbres = await client.query(
      "SELECT rt.*, t.tag_name, t.tag_colour FROM resource_tags rt JOIN tags t ON rt.tag_id = t.tag_id"
    );
    res.status(201).json({
      status: "success",
      message: "Added a new resource",
      data: dbres.rows,
    });
  }
);

// delete an entry in like table to unlike and undislike
app.delete<{ id: number }, {}, { user_id: number }>(
  "/resources/:id/likes",
  async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    const dbres = await client.query(
      "DELETE FROM likes WHERE author_id = $1 AND resource_id = $2 RETURNING *;",
      [user_id, id]
    );
    res.status(200).json({
      status: "success",
      message: "Updated the number of likes for a spific resource",
      data: dbres.rows[0],
    });
  }
);

//add a resource to the study list of a specific user
app.delete<{}, {}, StudyList>("/study_list/delete", async (req, res) => {
  //endpoint naming conventions
  const { user_id, resource_id } = req.body;
  const resourceExists = await client.query(
    "SELECT * FROM study_list WHERE user_id = $1 and resource_id = $2",
    [user_id, resource_id]
  );
  if (resourceExists.rowCount !== 0) {
    const dbres = await client.query(
      "DELETE FROM study_list WHERE user_id = $1 and resource_id = $2 RETURNING *",
      [user_id, resource_id]
    );
    res.status(200).json({
      status: "success",
      message: "Deleted a resource from study list",
      data: dbres.rows,
    });
  } else {
    res.status(409).json({
      //or 500?
      status: "fail",
      message: "There was no resource to delete",
    });
  }
});

//add a resource to the study list of a specific user
app.delete<{ id: number }>("/resources/delete/:id", async (req, res) => {
  //endpoint naming conventions
  const { id } = req.params;
  const resourceExists = await client.query(
    "SELECT * FROM resources WHERE id= $1",
    [id]
  );
  if (resourceExists.rowCount !== 0) {
    const dbres = await client.query(
      "DELETE FROM resources WHERE id = $1 RETURNING *",
      [id]
    );
    res.status(200).json({
      status: "success",
      message: "Deleted a resource",
      data: dbres.rows,
    });
  } else {
    res.status(409).json({
      //or 500?
      status: "fail",
      message: "There was no resource to delete",
    });
  }
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
