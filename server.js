var express = require('express');
const path = require('path');
const exphbs = require("express-handlebars");

//server
var app = express();

//routes
var indexRouter = require("./routes/index");

//view engine setup
const hbs = exphbs.create({
  extname: "hbs",
  defaultLayout: "main"
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");

//Declaring public folder
app.use(express.static(path.join(__dirname, "public")));

//Routinging pages
app.use("/", indexRouter);

//listen
const port = process.env.PORT || 4002;

app.listen(port, ()=> {
  console.log('listening at port ' + port + '...');
});
