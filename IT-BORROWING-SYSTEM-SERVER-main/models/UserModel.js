import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["Staff", "Student", "Admin"],
    default: "Student",
  },
  status: {
    type: String,
    enum: ["Active", "Suspended"],
    default: "Active",
  },
  profilepic: {
    type: String,
    default: "",
  },
}, {
  versionKey: false
});

const UserModel = mongoose.model("Users", UserSchema);

export default UserModel;

