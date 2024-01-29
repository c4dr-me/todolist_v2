const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
require('dotenv').config();


mongoose.connect(process.env.MONGODB_URI);

const itemsSchema = {
    name: String
};
const listSchema = {
    name: String,
    items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);
const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
    name: "Welcome to your ToDoList!"
});

const item2 = new Item({
    name: "Hit the + button to add a new item."
});

const item3 = new Item({
    name: "Click this to delete an item."
});

const defaultItems = [item1, item2, item3];


app.get("/", async function (req, res) {
    try {
        const foundItems = await Item.find();
        console.log(foundItems);

        if (foundItems.length === 0) {
            // Insert default items only if there are no items in the database
            await insertDefaultItems();
            res.redirect("/");
        }

        // Now render the list, whether default items were inserted or not
        res.render("list", { listTitle: "Today", listItems: foundItems });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

async function insertDefaultItems() {
    try {
        await Item.insertMany(defaultItems);
        console.log("Default items added successfully to the database.");
    } catch (err) {
        console.error(err);
        throw err; // Rethrow the error to be caught by the calling function (in this case, the route handler)
    }
}

app.post("/", async function (req, res) {
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({
        name: itemName
    });
    if (listName === "Today") {
        item.save();
        res.redirect("/");
    } else {
        try {
            const newList = await List.findOne({ name: listName });
            newList.items.push(item);
            await newList.save();
            res.redirect("/" + listName);
        } catch (err) {
            console.log(err);
        }
    }
    // console.log(req.body);
});

app.post("/delete", async function (req, res) {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === "Today") {
        try {
            const removedItem = await Item.findByIdAndDelete(checkedItemId);
            res.redirect("/");
            console.log("Removed :" + removedItem);
        } catch (err) {
            console.log(err);
        }
    } else {
        try {
            await List.findOneAndUpdate(
                { name: listName },
                { $pull: { items: { _id: checkedItemId } } }
            );
            res.redirect("/" + listName);
            console.log("Item removed from list: " + checkedItemId);
        } catch (err) {
            console.log(err);
        }
    }
});

app.get("/:customListName", async function (req, res) {
    const customListName = _.capitalize(req.params.customListName);

    try {
        const foundList = await List.findOne({ name: customListName });

        if (!foundList) {
            console.log("Doesn't exist");

            const list = new List({
                name: customListName,
                items: defaultItems
            });

            await list.save();
            console.log("List created");
            res.redirect("/" + customListName);
        } else {
            console.log("Exists");
            res.render("list", { listTitle: foundList.name, listItems: foundList.items });
        }

    } catch (err) {
        console.error(err);
    }
});

app.get("/about", function (req, res) {
    res.render("about");
});


app.listen(process.env.PORT || 3000, function () {
    console.log("Server started on port 3000");
});