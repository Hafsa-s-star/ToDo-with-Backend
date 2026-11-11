import mongoose from "mongoose"

const todoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  notes: {
    type: String,
    default: "",
    maxlength: 500,
  },
  category: {
    type: String,
    enum: ["Personal", "Work", "Wellness", "Learning"],
    default: "Personal",
  },
  priority: {
    type: String,
    enum: ["normal", "high"],
    default: "normal",
  },
  dueDate: {
    type: String,
    default: "",
  },
  completed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})

const Todo = mongoose.models.todo || mongoose.model("todo", todoSchema)
export default Todo
