-- Delete tables if exists
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS study_list;
DROP TABLE IF EXISTS resource_tags;
DROP TABLE IF EXISTS comments;
-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_faculty boolean NOT NULL);
  
CREATE TABLE resources (
  id SERIAL PRIMARY KEY NOT NULL,
  author_id int NOT NULL,
  title VARCHAR(255) NOT NULL,
  description text NOT NULL,
  recommended VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  date_added BIGINT NOT NULL DEFAULT date_part('epoch', now()),
  likes int NOT NULL,
          FOREIGN KEY(author_id) 
	  REFERENCES users(id)
);

CREATE TABLE tags (
  tag_id SERIAL PRIMARY KEY NOT NULL,
  tag_name VARCHAR(255));

CREATE TABLE study_list (
  id SERIAL PRIMARY KEY NOT NULL,
  user_id int NOT NULL,
  resource_id int NOT NULL,
  to_study boolean NOT NULL,
      FOREIGN KEY(user_id) 
	  REFERENCES users(id),
      FOREIGN KEY(resource_id) 
	  REFERENCES resources(id)
);
  
CREATE TABLE resource_tags (
  tag_id int NOT NULL,
  resource_id int NOT NULL,
  PRIMARY KEY (tag_id, resource_id),
      FOREIGN KEY(tag_id) 
	  REFERENCES tags(tag_id),
      FOREIGN KEY(resource_id) 
	  REFERENCES resources(id)
  );
  
CREATE TABLE comments (
  comment_id SERIAL PRIMARY KEY NOT NULL,
  resource_id int NOT NULL,
  author_id int NOT NULL,
  comment_text text,
  date_added BIGINT NOT NULL DEFAULT date_part('epoch', now()),
  FOREIGN KEY(author_id) 
  REFERENCES users(id),
  FOREIGN KEY(resource_id) 
  REFERENCES resources(id)
  );
