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
export interface Comment {
  author_id: number;
  comment_text: string;
}

export interface Like {
  liked: boolean;
}

export interface Tag {
  tag_name: string;
  tag_colour: string;
}

export interface StudyList {
  resource_id: number;
  studied: boolean;
}

export interface Resource {
  author_id: number;
  title: string;
  description: string;
  type: string;
  recommended: string;
  url: string;
  week: string;
}

// <----------------------------------- /resources -------------------------------------------->

// get all resources
app.get("/resources", async (req, res) => {
  // edit documentation
  const dbres = await client.query(
    "SELECT r.*, u.name, u.is_faculty, CAST(COALESCE(l.like_count, 0) AS INT) likes,\
    CAST(COALESCE(d.dislike_count, 0) AS INT) dislikes\
    FROM (SELECT resource_id, COUNT(*) like_count FROM likes WHERE liked = true GROUP BY resource_id) l\
    RIGHT JOIN resources r ON r.id = l.resource_id\
    LEFT JOIN (SELECT resource_id, COUNT(*) dislike_count FROM likes WHERE liked = false GROUP BY resource_id) d ON r.id = d.resource_id\
    JOIN users u ON u.id = r.author_id\
    ORDER BY date_added DESC;"
  );

  const response = [];
  for (const resource of dbres.rows) {
    const tagsDbres = await client.query(
      "SELECT t.* FROM tags t JOIN resource_tags rt ON t.tag_id = rt.tag_id WHERE rt.resource_id = $1",
      [resource.id]
    );
    // const tagsOfResource = tagsDbres.rows.map((tagObj) => tagObj.tag_name); // if you only want the tag name, not the tag object
    response.push({ ...resource, tags: tagsDbres.rows });
  }

  res.status(200).json({
    status: "success",
    message: "Retrieved bee-sources",
    data: response,
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

// get all tags associated with a specific resource
app.get<{ id: number }>("/resources/:id/tags", async (req, res) => {
  const { id } = req.params;
  const dbres = await client.query(
    "SELECT t.* FROM tags t JOIN resource_tags rt ON t.tag_id = rt.tag_id WHERE rt.resource_id = $1",
    [id]
  );
  res.status(200).json({
    status: "success",
    message: "Retrieved all tags for a single resource",
    data: dbres.rows,
  });
});

// get all comments associated with a specific resource
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

// get's like/dislike status for a specific user on a specific resource
app.get<{ id: number; author_id: number }>( // add documentation
  "/resources/:id/likes/:author_id",
  async (req, res) => {
    const { id, author_id } = req.params;
    const dbres = await client.query(
      "SELECT * FROM likes WHERE author_id = $1 AND resource_id = $2;",
      [author_id, id]
    );
    if (dbres.rowCount !== 0) {
      res.status(200).json({
        status: "success",
        message: `Got like/dislike status for user ${author_id} of resource ${id}`,
        data: dbres.rows[0].liked,
      });
    } else {
      res.status(200).json({
        status: "not found",
        message: `Got like/dislike status for user ${author_id} of resource ${id}`,
        data: null,
      });
    }
  }
);

// get add to study list status
app.get<{ id: number; user_id: number }>( // add documentation
  "/resources/:id/study_list/:user_id",
  async (req, res) => {
    const { id, user_id } = req.params;
    const dbres = await client.query(
      "SELECT * FROM study_list WHERE user_id = $1 AND resource_id = $2;",
      [user_id, id]
    );
    if (dbres.rowCount !== 0) {
      res.status(200).json({
        status: "success",
        message: `Got study_list status for user ${user_id} of resource ${id}`,
        data: true,
      });
    } else {
      res.status(200).json({
        status: "not found",
        message: `Got study_list status for user ${user_id} of resource ${id}`,
        data: false,
      });
    }
  }
);

//add a new comment associated with a resource
app.post<{ id: number }, {}, Comment>(
  "/resources/:id/comments",
  async (req, res) => {
    const { id } = req.params;
    const { author_id, comment_text } = req.body;
    const dbres = await client.query(
      "INSERT INTO comments (resource_id, author_id, comment_text) VALUES ($1, $2, $3) RETURNING *",
      [id, author_id, comment_text]
    );
    res.status(201).json({
      status: "success",
      message: `Added a new comment to resource with id ${id}`,
      data: dbres.rows[0],
    });
  }
);

// add an entry into likes table to like or dislike
app.post<{ id: number; author_id: number }, {}, Like>(
  "/resources/:id/likes/:author_id",
  async (req, res) => {
    const { id, author_id } = req.params;
    const { liked } = req.body;
    await client.query(
      "INSERT INTO likes (author_id, resource_id, liked) VALUES ($1, $2, $3)",
      [author_id, id, liked]
    );
    res.status(200).json({
      status: "success",
      message: `${liked ? "Liked" : "Disliked"} resource with id ${id}`,
      data: {
        resource_id: id,
        author_id,
      },
    });
  }
);

// associates existing tags to a resource --> need to deal with duplicate tags
app.post<{ id: number }, {}, { tag_ids: number[] }>( // edit documentation
  "/resources/:id/tags",
  async (req, res) => {
    const { id } = req.params;
    const { tag_ids } = req.body;
    const successResponse = [];
    const failResponse = [];
    for (const tag_id of tag_ids) {
      const tagAdded = await client.query(
        "SELECT * FROM resource_tags WHERE resource_id = $1 AND tag_id = $2",
        [id, tag_id]
      );
      if (tagAdded.rowCount === 0) {
        const dbres = await client.query(
          "INSERT INTO resource_tags (tag_id, resource_id) VALUES ($1, $2) RETURNING *",
          [tag_id, id]
        );
        successResponse.push(dbres.rows[0]);
      } else {
        failResponse.push(tagAdded.rows[0]);
      }
    }

    if (failResponse.length === 0) {
      res.status(201).json({
        status: "success",
        message: "Associated existing tags with an existing resource",
        data: {
          associated: successResponse,
          alreadyAdded: failResponse,
        },
      });
    } else if (successResponse.length > 0) {
      res.status(409).json({
        status: "partial success",
        message: "Associated some existing tags with an existing resource",
        data: {
          associated: successResponse,
          alreadyAdded: failResponse,
        },
      });
    } else {
      res.status(400).json({
        status: "complete failure",
        message: "no tags were successfully associated with this resource",
        data: {
          associated: successResponse,
          alreadyAdded: failResponse,
        },
      });
    }
  }
);

//add a new resource
app.post<{}, {}, Resource>("/resources", async (req, res) => {
  // maybe include option to attach tags in the same endpoint?
  const { author_id, title, description, type, recommended, url, week } =
    req.body;
  const dbresDuplicateCheck = await client.query(
    "SELECT * from resources where url = $1",
    [url]
  );
  if (dbresDuplicateCheck.rowCount === 0) {
    const dbres = await client.query(
      "INSERT INTO resources (author_id, title, description, type, recommended, url, week) VALUES\
    ($1, $2, $3,$4, $5, $6, $7) RETURNING *",
      [author_id, title, description, type, recommended, url, week]
    );
    res.status(201).json({
      status: "success",
      message: "Added a new resource",
      data: dbres.rows[0],
    });
  } else {
    res.status(400).json({
      status: "error",
      message: "Trying to add duplicate resource",
      data: dbresDuplicateCheck.rows[0],
    });
  }
});

// delete an entry in like table to unlike and undislike
app.delete<{ id: number; author_id: number }>(
  "/resources/:id/likes/:author_id",
  async (req, res) => {
    const { id, author_id } = req.params;
    const dbres = await client.query(
      "DELETE FROM likes WHERE author_id = $1 AND resource_id = $2 RETURNING *;",
      [author_id, id]
    );
    res.status(200).json({
      status: "success",
      message: `user with id ${author_id} unliked/undisliked a resource of id ${id}`,
      data: dbres.rows[0],
    });
  }
);

//update the to_study status of a specific resource in a specific user's study list *PARKED*
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

// // deletes a resource to the study list of a specific user *PARKED*
// app.delete<{ id: number }>("/resources/:id", async (req, res) => {
//   //endpoint naming conventions
//   const { id } = req.params;
//   const resourceExists = await client.query(
//     "SELECT * FROM resources WHERE id= $1",
//     [id]
//   );
//   if (resourceExists.rowCount !== 0) {
//     const dbres = await client.query(
//       "DELETE FROM resources WHERE id = $1 RETURNING *",
//       [id]
//     );
//     res.status(200).json({
//       status: "success",
//       message: "Deleted a resource",
//       data: dbres.rows,
//     });
//   } else {
//     res.status(409).json({
//       status: "fail",
//       message: "There was no resource to delete",
//     });
//   }
// });

// <----------------------------------- /users -------------------------------------------->

// get all users
app.get("/users", async (req, res) => {
  const dbres = await client.query("SELECT * FROM users");
  res.status(200).json({
    status: "success",
    message: "Retrieved all users",
    data: dbres.rows,
  });
});

// <----------------------------------- /tags -------------------------------------------->

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

//add a new tag when it doesn't already exist --> need to make an array of tags
app.post<{}, {}, { tags: Tag[] }>("/tags", async (req, res) => {
  const { tags } = req.body;
  const successResponse = [];
  const failResponse = [];
  for (const tag of tags) {
    const tagExists = await client.query(
      "SELECT * FROM tags WHERE tag_name = $1",
      [tag.tag_name]
    );
    if (tagExists.rowCount === 0) {
      const dbres = await client.query(
        "INSERT INTO tags (tag_name, tag_colour) VALUES ($1, $2) RETURNING *",
        [tag.tag_name, tag.tag_colour]
      );
      successResponse.push(dbres.rows[0]);
    } else {
      failResponse.push(tagExists.rows[0]);
    }
  }
  if (failResponse.length === 0) {
    res.status(200).json({
      status: "success",
      message: "all tags were successfully added",
      data: {
        added: successResponse,
        duplicates: failResponse,
      },
    });
  } else if (successResponse.length > 0) {
    res.status(409).json({
      status: "partial success",
      message: "some tags were successfully added",
      data: {
        added: successResponse,
        duplicates: failResponse,
      },
    });
  } else {
    res.status(400).json({
      status: "complete failure",
      message: "no tags were successfully added",
      data: {
        added: successResponse,
        duplicates: failResponse,
      },
    });
  }
});

//   const { tag_name, tag_colour } = req.body;
//   const tagExists = await client.query(
//     "SELECT * FROM tags WHERE tag_name = $1",
//     [tag_name]
//   );
//   if (tagExists.rowCount === 0) {
//     const dbres = await client.query(
//       "INSERT INTO tags (tag_name, tag_colour) VALUES ($1, $2) RETURNING *",
//       [tag_name, tag_colour]
//     );
//     res.status(201).json({
//       status: "success",
//       message: "Added a new tag",
//       data: dbres.rows,
//     });
//   } else {
//     res.status(409).json({
//       //or 500?
//       status: "fail",
//       message: "Tag already exists",
//       data: tagExists.rows,
//     });
//   }
// });

// get the study list resources for an associated user
app.get<{ user_id: number }>("/study_list/:user_id", async (req, res) => {
  // add tags to this endpoint
  const { user_id } = req.params;
  const dbres = await client.query(
    "SELECT r.*, u.name, u.is_faculty, CAST(COALESCE(l.like_count, 0) AS INT) likes,\
    CAST(COALESCE(d.dislike_count, 0) AS INT) dislikes, sl.studied\
    FROM (SELECT resource_id, COUNT(*) like_count FROM likes WHERE liked = true GROUP BY resource_id) l\
    RIGHT JOIN resources r ON r.id = l.resource_id\
    LEFT JOIN (SELECT resource_id, COUNT(*) dislike_count FROM likes WHERE liked = false GROUP BY resource_id) d ON r.id = d.resource_id\
    JOIN users u ON u.id = r.author_id\
    JOIN study_list sl ON r.id = sl.resource_id\
    WHERE sl.user_id = $1\
    ORDER BY date_added DESC;",
    [user_id]
  );

  const response = [];
  for (const resource of dbres.rows) {
    const tagsDbres = await client.query(
      "SELECT t.* FROM tags t JOIN resource_tags rt ON t.tag_id = rt.tag_id WHERE rt.resource_id = $1",
      [resource.id]
    );
    // const tagsOfResource = tagsDbres.rows.map((tagObj) => tagObj.tag_name); // if you only want the tag name, not the tag object
    response.push({ ...resource, tags: tagsDbres.rows });
  }

  res.status(200).json({
    status: "success",
    message: `Retrieved all study list resources for user ${user_id}`,
    data: response,
  });
});

//add a resource to the study list of a specific user
app.post<{ user_id: number }, {}, StudyList>(
  "/study_list/:user_id",
  async (req, res) => {
    //need to alter the front-end so that you can't add a specific resource to a study list more than once
    const { user_id } = req.params;
    const { resource_id } = req.body;
    const dbres = await client.query(
      "INSERT INTO study_list (user_id, resource_id, studied) VALUES ($1, $2, DEFAULT) RETURNING *",
      [user_id, resource_id]
    );
    res.status(201).json({
      status: "success",
      message: "Added a resource to the study list of a specific user",
      data: dbres.rows,
    });
  }
);

// update the studied status of a specific resource in a specific user's study list
app.put<{ user_id: number }, {}, StudyList>(
  "/study_list/:user_id",
  async (req, res) => {
    //when do we use req.body and when to use req.params
    const { user_id } = req.params;
    const { resource_id, studied } = req.body;
    const dbres = await client.query(
      "UPDATE study_list SET studied = $1 WHERE user_id = $2 and resource_id = $3 RETURNING *",
      [studied, user_id, resource_id]
    );
    res.status(200).json({
      status: "success",
      message:
        "Updated the to_study status of a specific resource in a specific user's study list",
      data: dbres.rows,
    });
  }
);

// <---

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

// delete a resource to the study list of a specific user
app.delete<{ user_id: number; resource_id: number }>(
  "/study_list/:user_id/:resource_id",
  async (req, res) => {
    //endpoint naming conventions
    const { user_id, resource_id } = req.params;
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
        status: "fail",
        message: "There was no resource to delete",
      });
    }
  }
);

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
export const server = app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});

export default app;
