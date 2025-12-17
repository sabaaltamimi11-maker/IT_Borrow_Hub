import mongoose from "mongoose";

const BorrowingSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Devices",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  borrowDate: {
    type: Date,
    default: Date.now,
  },
  returnDate: {
    type: Date,
    required: true,
  },
  actualReturnDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ["Pending", "Active", "Returned", "Overdue"],
    default: "Pending",
  },
  conditionBefore: {
    type: String,
    default: "",
  },
  conditionAfter: {
    type: String,
    default: "",
  },
  fine: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: "",
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Not Required"],
    default: "Not Required",
  },
  paymentDate: {
    type: Date,
    default: null,
  },
}, {
  versionKey: false
});

const BorrowingModel = mongoose.model("Borrowings", BorrowingSchema);

export default BorrowingModel;

