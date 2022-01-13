-- -- Delete tables if exists
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS resources;
-- DROP TABLE IF EXISTS tags;
-- DROP TABLE IF EXISTS study_list;
-- DROP TABLE IF EXISTS resource_tags;
-- DROP TABLE IF EXISTS comments;
-- DROP TABLE IF EXISTS likes;

-- Drop entire schema if exists and recreate it
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

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
  type VARCHAR(255) NOT NULL,
  recommended VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  date_added BIGINT NOT NULL DEFAULT date_part('epoch', now()),
  FOREIGN KEY (author_id) REFERENCES users (id)
);

CREATE TABLE tags (
  tag_id SERIAL PRIMARY KEY NOT NULL,
  tag_name VARCHAR(255) NOT NULL,
  tag_colour CHAR(7) NOT NULL
);

CREATE TABLE study_list (
  user_id int NOT NULL,
  resource_id int NOT NULL,
  studied boolean NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, resource_id),
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (resource_id) REFERENCES resources (id)
);
  
CREATE TABLE resource_tags (
  tag_id int NOT NULL,
  resource_id int NOT NULL,
  PRIMARY KEY (tag_id, resource_id),
  FOREIGN KEY (tag_id) REFERENCES tags (tag_id),
  FOREIGN KEY (resource_id) REFERENCES resources (id)
);
  
CREATE TABLE comments (
  comment_id SERIAL PRIMARY KEY NOT NULL,
  resource_id int NOT NULL,
  author_id int NOT NULL,
  comment_text text NOT NULL,
  date_added BIGINT NOT NULL DEFAULT date_part('epoch', now()),
  FOREIGN KEY (author_id) REFERENCES users (id),
  FOREIGN KEY (resource_id) REFERENCES resources (id)
);

CREATE TABLE likes (
	author_id INT NOT NULL,
  resource_id INT NOT NULL,
  liked BOOLEAN NOT NULL,
  PRIMARY KEY (author_id, resource_id),
  FOREIGN KEY (author_id) REFERENCES users (id),
  FOREIGN KEY (resource_id) REFERENCES resources (id)
);

-- insert into users table
INSERT INTO users (name, is_faculty)
VALUES 
('Berenika', false),
('Christopher', false),
('Ed', false),
('Hanna', false),
('Ed', false),
('Jamie', false),
('Jenna', false),
('Katarzyna', false),
('Matt P', false),
('Nicolas', false),
('Rajwinder', false),
('Toye', false),
('Alisa', false),
('Chumphot', false),
('David', false),
('Emma', false),
('Faith', false),
('Grace', false),
('Joely', false),
('Linus', false),
('Martha', false),
('Renee', false),
('Truman', false),
('Neill', true),
('Richard', true);

-- insert into resources
INSERT INTO resources (author_id, title, description, type, recommended, url)
VALUES 
(1,'CSS tricks','A great website for styling up your apps.', 'Article','Un-bee-table','https://css-tricks.com/'),
(1,'My first resource', 'Updating the description', 'Article','Un-bee-liveable','www.google.com'),
(4,'Battle practice','A truly magnificent website for practicing your code warfare skills. Find your own Austerlitz on codewars!', 'Article','Un-bee-table','https://www.codewars.com'),
(1,'Beri rules', 'LOL', 'Article','May-bee','www.youtube.com'),
(2,'Computer programming','Computer programming is the process of designing and building an executable computer program to accomplish a specific computing result or to perform a particular task. Programming involves tasks such as analysis, generating algorithms, profiling algorithms accuracy and resource consumption, and the implementation of algorithms in a chosen programming language (commonly referred to as coding)', 'Article','Un-bee-lieveable','www.google.com'),
(2,'Beer','Beer is one of the oldest[1][2][3] and most widely consumed[4] alcoholic drinks in the world, and the third most popular drink overall after water and tea.[5] It is produced by the brewing and fermentation of starches, mainly derived from cereal grains—most commonly from malted barley, though wheat, maize (corn), rice, and oats are also used. During the brewing process, fermentation of the starch sugars in the wort produces ethanol and carbonation in the resulting beer.[6] Most modern beer is brewed with hops, which add bitterness and other flavours and act as a natural preservative and stabilizing agent.', 'Article','Un-bee-liveable','www.google.com'),
(1,'Basics of Javascript Course','A course on javascript, it is three hours long and useless, so my personal opinon is: no we cannot.', 'Article','Buzzkill','https://www.youtube.com/watch?v=PkZNo7MFNFg'),
(3,'HTTP status codes','An overview of HTTP status codes. Useful, but not riveting', 'Article','May-bee','https://developer.mozilla.org/en-US/docs/Web/HTTP/Status');

-- insert into tags
INSERT INTO tags (tag_name, tag_colour)
VALUES
('Hooks', '#4b6cdb'),
('React', '#15aca6'),
('Testing', '#7d9681'),
('SQL', '#ad0052'),
('FrontEnd', '#786b6f'),
('BackEnd', '#7fde25'),
('Javascript', '#FFC300');

-- insert into resource tags (to associate tags with a specific resource)
INSERT INTO resource_tags (tag_id, resource_id)
VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 2),
(5, 2),
(6, 2),
(3, 7),
(4, 7),
(5, 7),
(6, 7),
(2, 8),
(1, 8);

-- insert into comments table 
INSERT INTO comments (resource_id, author_id, comment_text)
VALUES
(7, 16, 'Woah! This is so cool'),
(7, 14, 'Yeah I know right!'),
(7, 13, 'Hivemind is literally the best thing'),
(7, 12, 'Its defo gna be a unicorn one day :))');


-- -- dummy data
-- INSERT INTO users VALUES 
-- (DEFAULT, 'Barack Obama', true);

-- INSERT INTO resources VALUES 
-- (DEFAULT, 1, 'My first resource', 'A description of my resource', 'Un-bee-liveable',
--  'www.google.com',DEFAULT, 0);
 
-- INSERT INTO tags VALUES 
-- (DEFAULT, 'Javascript');

-- INSERT INTO study_list VALUES 
-- (DEFAULT, 1, 1,false);

-- INSERT INTO resource_tags VALUES 
-- (1,1);

-- INSERT INTO comments VALUES 
-- (DEFAULT,1,1, 'My first comment', DEFAULT);

-- -- second set of dummy data

-- INSERT INTO users VALUES 
-- (DEFAULT, 'Katy Perry', false);

-- INSERT INTO resources VALUES 
-- (DEFAULT, 2, 'My second resource', 'A description of my resource', 'May-bee',
--  'www.google.com',DEFAULT, 0);
 
-- INSERT INTO tags (tag_id, tag_name) VALUES 
-- (DEFAULT, 'Hooks'), (DEFAULT, 'Testing');

-- INSERT INTO study_list VALUES 
-- (DEFAULT, 2, 1, false);

-- INSERT INTO resource_tags (tag_id, resource_id) VALUES 
-- (2, 2), (3, 2);

-- INSERT INTO comments VALUES 
-- (DEFAULT,2,2, 'My first comment by Katy', DEFAULT);










