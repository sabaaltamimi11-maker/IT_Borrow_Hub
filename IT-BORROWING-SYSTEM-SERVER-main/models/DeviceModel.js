import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Available", "Borrowed", "Damaged"],
    default: "Available",
  },
  condition: {
    type: String,
    enum: ["Before", "After"],
    default: "Before",
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: String,
    default: "",
  },
  lat: {
    type: Number,
    default: null,
  },
  lng: {
    type: Number,
    default: null,
  },
  description: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
}, {
  versionKey: false
});

const DeviceModel = mongoose.model("Devices", DeviceSchema);

export default DeviceModel;

