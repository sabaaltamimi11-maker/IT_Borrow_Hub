import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import UserModel from "./models/UserModel.js";
import DeviceModel from "./models/DeviceModel.js";
import BorrowingModel from "./models/BorrowingModel.js";
import PostModel from "./models/PostModel.js";
import bcrypt from "bcrypt";

let app = express();

app.use(cors());
app.use(express.json());

const conStr =
  "mongodb+srv://utas_db:1234@cluster0.eate6en.mongodb.net/IT-Borrowing-System?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(conStr)
  .then(() => {
    console.log("Connected to MongoDB successfully!");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// ==================== AUTHENTICATION APIs ====================

app.post("/login", async (req, res) => {
  try {
    const user = await UserModel.findOne({ email: req.body.email });
    if (!user) res.status(500).json({ message: "User not found" });
    else {
      const pass_valid = await bcrypt.compare(req.body.password, user.password);
      if (pass_valid) res.status(200).json({ user: user, message: "success" });
      else res.status(401).json({ message: "Unauthorized user" });
    }
  } catch (error) {
    res.send(error);
  }
});

app.post("/register", async (req, res) => {
  try {
    // Validation: Check required fields
    if (!req.body.email || !req.body.password || !req.body.username) {
      return res.status(400).json({ message: "Email, password, and username are required" });
    }
    
    // Validation: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Validation: Password strength (minimum 8 characters)
    if (req.body.password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    
    // Business Logic: Check if user already exists
    const existingUser = await UserModel.findOne({ 
      $or: [
        { email: req.body.email },
        { username: req.body.username }
      ]
    });
    
    if (existingUser) {
      return res.status(500).json({ message: "User already exists" });
    }
    
    // Business Logic: Hash password before saving
    const hpass = await bcrypt.hash(req.body.password, 10);
    
    const newuser = new UserModel({
      username: req.body.username.trim(),
      email: req.body.email.trim().toLowerCase(),
      password: hpass,
      role: req.body.role || "Student",
      status: "Active",
      profilepic: req.body.profilepic || "",
    });
    
    await newuser.save();
    res.status(200).json({ message: "User Registered Successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
});

// ==================== DEVICE APIs (CRUD) ====================

app.post("/saveDevice", async (req, res) => {
  try {
    // Validation: Check required fields
    if (!req.body.name || !req.body.serialNumber || !req.body.category) {
      return res.status(400).json({ message: "Name, Serial Number, and Category are required" });
    }
    
    // Validation: Check if device already exists
    const device = await DeviceModel.findOne({
      serialNumber: req.body.serialNumber.trim(),
    });
    if (device) {
      return res.status(500).json({ message: "Device already exists" });
    }
    
    // Business Logic: Set default values and trim inputs
    const newdevice = new DeviceModel({
      name: req.body.name.trim(),
      serialNumber: req.body.serialNumber.trim(),
      category: req.body.category.trim(),
      status: req.body.status || "Available",
      condition: req.body.condition || "Before",
      purchaseDate: req.body.purchaseDate || Date.now(),
      location: req.body.location?.trim() || "",
      description: req.body.description?.trim() || "",
      image: req.body.image?.trim() || "",
      lat: req.body.lat || null,
      lng: req.body.lng || null,
    });
    
    await newdevice.save();
    
    // إشعار للإدمن: تم إضافة جهاز جديد
    console.log(`[NOTIFICATION] New device added: "${newdevice.name}" (${newdevice.category})`);
    
    res.status(200).json({ message: "Device Added Successfully", device: newdevice });
  } catch (error) {
    console.error("Error saving device:", error);
    res.status(500).json({ message: "Error saving device", error: error.message });
  }
});

app.get("/showDevices", async (req, res) => {
  try {
    const devices = await DeviceModel.find({});
    res.send(devices);
  } catch (error) {
    res.send(error);
  }
});

app.get("/showDevice/:id", async (req, res) => {
  try {
    const device = await DeviceModel.findOne({ _id: req.params.id });
    if (!device) res.status(404).json({ message: "Device not found" });
    else res.send(device);
  } catch (error) {
    res.send(error);
  }
});

app.put("/updateDevice", async (req, res) => {
  try {
    if (!req.body._id) {
      return res.status(400).json({ message: "Device ID is required" });
    }
    const device = await DeviceModel.findOne({ _id: req.body._id });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    const oldStatus = device.status;
    if (req.body.name !== undefined) device.name = req.body.name;
    if (req.body.serialNumber !== undefined) device.serialNumber = req.body.serialNumber;
    if (req.body.category !== undefined) device.category = req.body.category;
    if (req.body.status !== undefined) device.status = req.body.status;
    if (req.body.condition !== undefined) device.condition = req.body.condition;
    if (req.body.location !== undefined) device.location = req.body.location;
    if (req.body.description !== undefined) device.description = req.body.description;
    if (req.body.image !== undefined) device.image = req.body.image;
    if (req.body.lat !== undefined) device.lat = req.body.lat;
    if (req.body.lng !== undefined) device.lng = req.body.lng;
    await device.save();
    
    // إشعار للإدمن: تم تحديث جهاز
    if (oldStatus !== device.status) {
      console.log(`[NOTIFICATION] Device status changed: "${device.name}" status changed from "${oldStatus}" to "${device.status}"`);
    } else {
      console.log(`[NOTIFICATION] Device updated: "${device.name}" information was updated`);
    }
    
    res.status(200).json({ message: "Device Updated Successfully", device: device });
  } catch (error) {
    res.status(500).json({ message: "Error updating device", error: error.message });
  }
});

app.delete("/deleteDevice/:id", async (req, res) => {
  try {
    // First, check if device exists and its status
    const device = await DeviceModel.findOne({ _id: req.params.id });
    
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    // Check if device is currently borrowed
    if (device.status === "Borrowed") {
      return res.status(400).json({ 
        message: "Cannot delete device: Device is currently borrowed. Please return it first." 
      });
    }
    
    // Check if there are any active or pending borrowings for this device
    const activeBorrowings = await BorrowingModel.find({
      deviceId: req.params.id,
      status: { $in: ["Pending", "Active", "Overdue"] }
    });
    
    if (activeBorrowings.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete device: Device has active or pending borrowings. Please resolve them first." 
      });
    }
    
    // If all checks pass, delete the device
    const deletedDevice = await DeviceModel.findOneAndDelete({ _id: req.params.id });
    
    // إشعار للإدمن: تم حذف جهاز
    if (deletedDevice) {
      console.log(`[NOTIFICATION] Device deleted: "${deletedDevice.name}" (${deletedDevice.category}) was deleted`);
    }
    
    res.status(200).json({ device: deletedDevice, message: "Device Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting device", error: error.message });
  }
});

app.get("/searchDevices", async (req, res) => {
  try {
    const query = req.query.q || "";
    const category = req.query.category || "";
    let searchQuery = {};
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }
    if (category) {
      searchQuery.category = category;
    }
    const devices = await DeviceModel.find(searchQuery);
    res.send(devices);
  } catch (error) {
    res.send(error);
  }
});

// ==================== BORROWING APIs (CRUD) ====================

app.post("/saveBorrowing", async (req, res) => {
  try {
    const device = await DeviceModel.findOne({ _id: req.body.deviceId });
    if (!device) res.status(404).json({ message: "Device not found" });
    else if (device.status !== "Available")
      res.status(500).json({ message: "Device is not available" });
    else {
      const user = await UserModel.findOne({ _id: req.body.userId });
      const newborrowing = new BorrowingModel({
        deviceId: req.body.deviceId,
        userId: req.body.userId,
        borrowDate: req.body.borrowDate || Date.now(),
        returnDate: req.body.returnDate,
        status: "Pending",
        conditionBefore: req.body.conditionBefore || "",
      });
      await newborrowing.save();
      device.status = "Borrowed";
      await device.save();
      
      // إشعار للإدمن: تم إنشاء طلب استعارة جديد
      console.log(`[NOTIFICATION] New borrowing request: User ${user?.username || req.body.userId} wants to borrow device "${device.name}"`);
      
      res.status(200).json({ message: "Borrowing Request Created" });
    }
  } catch (error) {
    res.send(error);
  }
});

app.get("/showBorrowings", async (req, res) => {
  try {
    const usersCollection = UserModel.collection.name;
    const devicesCollection = DeviceModel.collection.name;
    
    const borrowings = await BorrowingModel.aggregate([
      {
        $lookup: {
          from: devicesCollection,
          localField: "deviceId",
          foreignField: "_id",
          as: "device",
        },
      },
      {
        $lookup: {
          from: usersCollection,
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $sort: {
          borrowDate: -1,
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.__v": 0,
        },
      },
    ]);
    res.send(borrowings);
  } catch (error) {
    res.send(error);
  }
});

app.get("/showBorrowing/:id", async (req, res) => {
  try {
    const borrowing = await BorrowingModel.findOne({ _id: req.params.id })
      .populate("deviceId")
      .populate("userId");
    if (!borrowing) res.status(404).json({ message: "Borrowing not found" });
    else res.send(borrowing);
  } catch (error) {
    res.send(error);
  }
});

app.get("/showBorrowingsByUser/:userId", async (req, res) => {
  try {
    const usersCollection = UserModel.collection.name;
    const devicesCollection = DeviceModel.collection.name;
    
    const borrowings = await BorrowingModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.params.userId),
        },
      },
      {
        $lookup: {
          from: devicesCollection,
          localField: "deviceId",
          foreignField: "_id",
          as: "device",
        },
      },
      {
        $lookup: {
          from: usersCollection,
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $sort: {
          borrowDate: -1,
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.__v": 0,
        },
      },
    ]);
    res.send(borrowings);
  } catch (error) {
    res.send(error);
  }
});

app.put("/updateBorrowing", async (req, res) => {
  try {
    const borrowing = await BorrowingModel.findOne({ _id: req.body._id });
    if (!borrowing) res.status(404).json({ message: "Borrowing not found" });
    else {
      // Update status
      if (req.body.status !== undefined) {
        borrowing.status = req.body.status;
      }
      
      // Update conditionAfter
      if (req.body.conditionAfter !== undefined) {
        borrowing.conditionAfter = req.body.conditionAfter;
      }
      
      // Update notes
      if (req.body.notes !== undefined) {
        borrowing.notes = req.body.notes;
      }
      
      // Update fine
      if (req.body.fine !== undefined) {
        borrowing.fine = req.body.fine;
      }
      
      // If status is Returned, handle return logic
      if (req.body.status === "Returned") {
        borrowing.actualReturnDate = new Date();
        
        // Business Logic: Calculate fine based on conditions if fine not provided
        if (req.body.fine === undefined) {
          let calculatedFine = 0;
          const returnDate = new Date(borrowing.returnDate);
          const actualReturn = new Date(borrowing.actualReturnDate);
          const daysOverdue = Math.ceil((actualReturn - returnDate) / (1000 * 60 * 60 * 24));
          
          // Calculate fine for overdue (5 OMR per day)
          if (daysOverdue > 0) {
            calculatedFine += daysOverdue * 5;
          }
          
          // Calculate fine for damaged device (20 OMR base)
          if (borrowing.conditionAfter === "Damaged") {
            calculatedFine += 20;
          }
          
          borrowing.fine = calculatedFine;
        }
        
        // Set payment status based on fine
        if (borrowing.fine > 0) {
          borrowing.paymentStatus = "Pending";
        } else {
          borrowing.paymentStatus = "Not Required";
        }

        const device = await DeviceModel.findOne({ _id: borrowing.deviceId });
        const user = await UserModel.findOne({ _id: borrowing.userId });
        if (device) {
          if (borrowing.conditionAfter === "Damaged") {
            device.status = "Damaged";
            // إشعار للإدمن: تم إرجاع جهاز تالف
            console.log(`[NOTIFICATION] Device returned damaged: User ${user?.username || borrowing.userId} returned damaged device "${device.name}"`);
          } else {
            device.status = "Available";
            // إشعار للإدمن: تم إرجاع جهاز
            console.log(`[NOTIFICATION] Device returned: User ${user?.username || borrowing.userId} returned device "${device.name}"`);
          }
          await device.save();
        }
      } else if (req.body.status === "Active") {
        // Check if borrowing should be marked as Overdue
        const returnDate = new Date(borrowing.returnDate);
        const now = new Date();
        if (returnDate < now) {
          borrowing.status = "Overdue";
        }
        
        // إشعار للإدمن: تم تفعيل استعارة
        const device = await DeviceModel.findOne({ _id: borrowing.deviceId });
        const user = await UserModel.findOne({ _id: borrowing.userId });
        console.log(`[NOTIFICATION] Borrowing activated: User ${user?.username || borrowing.userId} activated borrowing for device "${device?.name || borrowing.deviceId}"`);
      } else if (req.body.status === "Overdue") {
        // إشعار للإدمن: استعارة متأخرة
        const device = await DeviceModel.findOne({ _id: borrowing.deviceId });
        const user = await UserModel.findOne({ _id: borrowing.userId });
        console.log(`[NOTIFICATION] Borrowing overdue: User ${user?.username || borrowing.userId} has overdue borrowing for device "${device?.name || borrowing.deviceId}"`);
      }
      
      // Update payment status if fine is set
      if (req.body.fine !== undefined) {
        if (borrowing.fine > 0) {
          borrowing.paymentStatus = "Pending";
        } else {
          borrowing.paymentStatus = "Not Required";
        }
      }
      
      await borrowing.save();
      
      // Populate device and user before sending response
      await borrowing.populate("deviceId", "name serialNumber category status");
      await borrowing.populate("userId", "username email");
      
      res.status(200).json({ 
        message: "Borrowing Updated Successfully",
        borrowing: borrowing
      });
    }
  } catch (error) {
    res.send(error);
  }
});

app.delete("/deleteBorrowing/:id", async (req, res) => {
  try {
    const borrowing = await BorrowingModel.findOne({ _id: req.params.id });
    if (!borrowing) res.status(404).json({ message: "Borrowing not found" });
    else {
      if (borrowing.status === "Active" || borrowing.status === "Pending") {
        const device = await DeviceModel.findOne({ _id: borrowing.deviceId });
        if (device) {
          device.status = "Available";
          await device.save();
        }
      }
      const deletedBorrowing = await BorrowingModel.findOneAndDelete({ _id: req.params.id });
      res.status(200).json({ borrowing: deletedBorrowing, message: "Borrowing Deleted Successfully" });
    }
  } catch (error) {
    res.send(error);
  }
});

// ==================== POST/REVIEW APIs (CRUD) ====================

app.post("/savePost", async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.body.userId });
    const device = await DeviceModel.findOne({ _id: req.body.deviceId });
    
    const new_post = new PostModel({
      deviceId: req.body.deviceId,
      userId: req.body.userId,
      text: req.body.text,
      image: req.body.image || "",
      rating: req.body.rating || 1,
      lat: req.body.lat || null,
      lng: req.body.lng || null,
      likes: [],
      dislikes: [],
    });
    await new_post.save();
    
    // إشعار للإدمن: تم إضافة تقييم جديد
    console.log(`[NOTIFICATION] New review: User ${user?.username || req.body.userId} added ${req.body.rating || 1} star review for device "${device?.name || req.body.deviceId}"`);
    
    res.status(200).json({ message: "Post Created Successfully" });
  } catch (error) {
    res.send(error);
  }
});

app.get("/showPosts", async (req, res) => {
  try {
    const usersCollection = UserModel.collection.name;
    const devicesCollection = DeviceModel.collection.name;
    
    const posts = await PostModel.aggregate([
      {
        $lookup: {
          from: devicesCollection,
          localField: "deviceId",
          foreignField: "_id",
          as: "device",
        },
      },
      {
        $lookup: {
          from: usersCollection,
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.__v": 0,
        },
      },
    ]);
    res.send(posts);
  } catch (error) {
    res.send(error);
  }
});

app.get("/showPostsByDevice/:deviceId", async (req, res) => {
  try {
    const usersCollection = UserModel.collection.name;
    const devicesCollection = DeviceModel.collection.name;
    
    const posts = await PostModel.aggregate([
      {
        $match: {
          deviceId: new mongoose.Types.ObjectId(req.params.deviceId),
        },
      },
      {
        $lookup: {
          from: usersCollection,
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: devicesCollection,
          localField: "deviceId",
          foreignField: "_id",
          as: "device",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.__v": 0,
        },
      },
    ]);
    res.send(posts);
  } catch (error) {
    res.send(error);
  }
});

app.put("/updatePost", async (req, res) => {
  try {
    if (!req.body._id) {
      return res.status(400).json({ message: "Post ID is required" });
    }
    const post = await PostModel.findOne({ _id: req.body._id });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (req.body.text !== undefined) post.text = req.body.text;
    if (req.body.image !== undefined) post.image = req.body.image;
    if (req.body.rating !== undefined) post.rating = req.body.rating;
    if (req.body.lat !== undefined) post.lat = req.body.lat;
    if (req.body.lng !== undefined) post.lng = req.body.lng;
    await post.save();
    res.status(200).json({ message: "Post Updated Successfully", post: post });
  } catch (error) {
    res.status(500).json({ message: "Error updating post", error: error.message });
  }
});

app.delete("/delPost/:pid", async (req, res) => {
  try {
    const post = await PostModel.findOneAndDelete({ _id: req.params.pid });
    res.status(200).json({ post: post, message: "Post Deleted Successfully" });
  } catch (error) {
    res.send(error);
  }
});

app.post("/likePost/:id", async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.status(400).json({ message: "UserId is required" });
    }
    const post = await PostModel.findOne({ _id: req.params.id });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const userId = new mongoose.Types.ObjectId(req.body.userId);
    const likesArray = post.likes.map(id => id.toString());
    if (likesArray.includes(userId.toString())) {
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
      post.dislikes = post.dislikes.filter((id) => id.toString() !== userId.toString());
    }
    await post.save();
    res.status(200).json({ message: "Post Liked", post: post });
  } catch (error) {
    res.status(500).json({ message: "Error liking post", error: error.message });
  }
});

app.post("/dislikePost/:id", async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.status(400).json({ message: "UserId is required" });
    }
    const post = await PostModel.findOne({ _id: req.params.id });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const userId = new mongoose.Types.ObjectId(req.body.userId);
    const dislikesArray = post.dislikes.map(id => id.toString());
    if (dislikesArray.includes(userId.toString())) {
      post.dislikes = post.dislikes.filter((id) => id.toString() !== userId.toString());
    } else {
      post.dislikes.push(userId);
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    }
    await post.save();
    res.status(200).json({ message: "Post Disliked", post: post });
  } catch (error) {
    res.status(500).json({ message: "Error disliking post", error: error.message });
  }
});

// ==================== USER APIs (CRUD) ====================

app.get("/showUsers", async (req, res) => {
  try {
    const users = await UserModel.find({}).select("-password");
    res.send(users);
  } catch (error) {
    res.send(error);
  }
});

app.get("/showUser/:id", async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.params.id }).select("-password");
    if (!user) res.status(404).json({ message: "User not found" });
    else res.send(user);
  } catch (error) {
    res.send(error);
  }
});

app.put("/updateUser", async (req, res) => {
  try {
    if (!req.body._id) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const user = await UserModel.findOne({ _id: req.body._id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (req.body.username !== undefined) user.username = req.body.username;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.role !== undefined) user.role = req.body.role;
    if (req.body.status !== undefined) user.status = req.body.status;
    if (req.body.profilepic !== undefined) user.profilepic = req.body.profilepic;
    if (req.body.password) {
      const hpass = await bcrypt.hash(req.body.password, 10);
      user.password = hpass;
    }
    await user.save();
    res.status(200).json({ message: "User Updated Successfully", user: user });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
});

app.delete("/deleteUser/:id", async (req, res) => {
  try {
    const user = await UserModel.findOneAndDelete({ _id: req.params.id });
    res.status(200).json({ user: user, message: "User Deleted Successfully" });
  } catch (error) {
    res.send(error);
  }
});

// ==================== NOTIFICATION & STATS APIs ====================

app.get("/getNotifications/:userId", async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.params.userId });
    const notifications = [];
    const now = new Date();

    // جميع الإشعارات للإدمن فقط
    if (user && user.role === "Admin") {
      // 1. إشعارات الاستعارات الجديدة (Pending)
      const pendingBorrowings = await BorrowingModel.find({
        status: "Pending",
      })
        .populate("userId", "username email")
        .populate("deviceId", "name")
        .sort({ borrowDate: -1 })
        .limit(20);

      pendingBorrowings.forEach((borrowing) => {
        const userName = borrowing.userId?.username || borrowing.userId?.email || "Unknown User";
        const deviceName = borrowing.deviceId?.name || "Unknown Device";
        notifications.push({
          type: "NewBorrowing",
          message: `New borrowing request: ${userName} wants to borrow "${deviceName}"`,
          borrowingId: borrowing._id,
          timestamp: borrowing.borrowDate,
        });
      });

      // 2. إشعارات الاستعارات النشطة
      const activeBorrowings = await BorrowingModel.find({
        status: "Active",
      })
        .populate("userId", "username email")
        .populate("deviceId", "name")
        .sort({ borrowDate: -1 })
        .limit(20);

      activeBorrowings.forEach((borrowing) => {
        const userName = borrowing.userId?.username || borrowing.userId?.email || "Unknown User";
        const deviceName = borrowing.deviceId?.name || "Unknown Device";
        const returnDate = new Date(borrowing.returnDate);
        const daysLeft = Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) {
          notifications.push({
            type: "Overdue",
            message: `⚠️ Overdue borrowing: ${userName} has not returned "${deviceName}" after due date`,
            borrowingId: borrowing._id,
            timestamp: borrowing.returnDate,
          });
        } else if (daysLeft <= 3) {
          notifications.push({
            type: "Warning",
            message: `Warning: ${userName} has ${daysLeft} day(s) left to return "${deviceName}"`,
            borrowingId: borrowing._id,
            timestamp: borrowing.returnDate,
          });
        }
      });

      // 3. إشعارات الاستعارات المرجعة
      const returnedBorrowings = await BorrowingModel.find({
        status: "Returned",
        actualReturnDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, // آخر 7 أيام
      })
        .populate("userId", "username email")
        .populate("deviceId", "name")
        .sort({ actualReturnDate: -1 })
        .limit(20);

      returnedBorrowings.forEach((borrowing) => {
        const userName = borrowing.userId?.username || borrowing.userId?.email || "Unknown User";
        const deviceName = borrowing.deviceId?.name || "Unknown Device";
        notifications.push({
          type: "Returned",
          message: `Device returned: ${userName} returned "${deviceName}"`,
          borrowingId: borrowing._id,
          timestamp: borrowing.actualReturnDate,
        });
      });

      // 4. إشعارات المدفوعات
      const recentPayments = await BorrowingModel.find({
        paymentStatus: "Paid",
        paymentDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, // آخر 7 أيام
      })
        .populate("userId", "username email")
        .populate("deviceId", "name")
        .sort({ paymentDate: -1 })
        .limit(20);

      recentPayments.forEach((borrowing) => {
        const userName = borrowing.userId?.username || borrowing.userId?.email || "Unknown User";
        const deviceName = borrowing.deviceId?.name || "Unknown Device";
        notifications.push({
          type: "Payment",
          message: `Payment received: ${userName} paid ${borrowing.fine} OMR fine for device "${deviceName}"`,
          borrowingId: borrowing._id,
          timestamp: borrowing.paymentDate,
        });
      });

      // 5. إشعارات المدفوعات المعلقة
      const pendingPayments = await BorrowingModel.find({
        fine: { $gt: 0 },
        paymentStatus: "Pending",
      })
        .populate("userId", "username email")
        .populate("deviceId", "name")
        .sort({ borrowDate: -1 })
        .limit(20);

      pendingPayments.forEach((borrowing) => {
        const userName = borrowing.userId?.username || borrowing.userId?.email || "Unknown User";
        const deviceName = borrowing.deviceId?.name || "Unknown Device";
        notifications.push({
          type: "PendingPayment",
          message: `Pending payment: ${userName} has ${borrowing.fine} OMR fine for device "${deviceName}"`,
          borrowingId: borrowing._id,
        });
      });

      // 6. إشعارات الاستعارات المتأخرة
      const overdueBorrowings = await BorrowingModel.find({
        status: "Overdue",
      })
        .populate("userId", "username email")
        .populate("deviceId", "name")
        .sort({ returnDate: -1 })
        .limit(20);

      overdueBorrowings.forEach((borrowing) => {
        const userName = borrowing.userId?.username || borrowing.userId?.email || "Unknown User";
        const deviceName = borrowing.deviceId?.name || "Unknown Device";
        notifications.push({
          type: "Overdue",
          message: `🚨 Overdue borrowing: ${userName} has not returned "${deviceName}" after due date`,
          borrowingId: borrowing._id,
          timestamp: borrowing.returnDate,
        });
      });

      // 7. إشعارات التقييمات الجديدة (آخر 7 أيام)
      const recentPosts = await PostModel.find({
        createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      })
        .populate("userId", "username email")
        .populate("deviceId", "name")
        .sort({ createdAt: -1 })
        .limit(20);

      recentPosts.forEach((post) => {
        const userName = post.userId?.username || post.userId?.email || "Unknown User";
        const deviceName = post.deviceId?.name || "Unknown Device";
        notifications.push({
          type: "NewReview",
          message: `New review: ${userName} added ${post.rating} star rating for device "${deviceName}"`,
          postId: post._id,
          timestamp: post.createdAt,
        });
      });
    } else {
      // للمستخدمين العاديين: إشعاراتهم الشخصية فقط
      const borrowings = await BorrowingModel.find({
        userId: req.params.userId,
        status: "Active",
      })
        .populate("deviceId")
        .sort({ returnDate: 1 });

      borrowings.forEach((borrowing) => {
        const returnDate = new Date(borrowing.returnDate);
        const daysLeft = Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
          notifications.push({
            type: "Overdue",
            message: `Device "${borrowing.deviceId.name}" is overdue! Please return it immediately.`,
            borrowingId: borrowing._id,
          });
        } else if (daysLeft <= 3) {
          notifications.push({
            type: "Warning",
            message: `Only ${daysLeft} day(s) left to return "${borrowing.deviceId.name}"`,
            borrowingId: borrowing._id,
          });
        }
      });
    }

    // ترتيب الإشعارات حسب التاريخ (الأحدث أولاً)
    notifications.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    res.send(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.send(error);
  }
});

app.get("/getStats", async (req, res) => {
  try {
    const totalDevices = await DeviceModel.countDocuments({});
    const availableDevices = await DeviceModel.countDocuments({
      status: "Available",
    });
    const borrowedDevices = await DeviceModel.countDocuments({
      status: "Borrowed",
    });
    const totalBorrowings = await BorrowingModel.countDocuments({});
    const activeBorrowings = await BorrowingModel.countDocuments({
      status: "Active",
    });
    const overdueBorrowings = await BorrowingModel.countDocuments({
      status: "Overdue",
    });

    res.send({
      totalDevices,
      availableDevices,
      borrowedDevices,
      totalBorrowings,
      activeBorrowings,
      overdueBorrowings,
    });
  } catch (error) {
    res.send(error);
  }
});

// ==================== PAYMENT API ====================

app.post("/payFine/:borrowingId", async (req, res) => {
  try {
    const borrowing = await BorrowingModel.findOne({ _id: req.params.borrowingId })
      .populate("userId", "username email")
      .populate("deviceId", "name");

    if (!borrowing) {
      return res.status(404).json({ message: "Borrowing not found" });
    }

    if (borrowing.fine <= 0) {
      return res.status(400).json({ message: "No fine to pay for this borrowing" });
    }

    if (borrowing.paymentStatus === "Paid") {
      return res.status(400).json({ message: "This fine has already been paid" });
    }

    borrowing.paymentStatus = "Paid";
    borrowing.paymentDate = new Date();
    await borrowing.save();

    res.status(200).json({
      message: "Payment Success",
      borrowing: borrowing,
    });
  } catch (error) {
    res.send(error);
  }
});

app.listen(5000, () => {
  console.log("Server started at 5000..");
});

