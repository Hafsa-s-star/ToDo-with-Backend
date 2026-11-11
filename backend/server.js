import app from "./src/app.js"
import connectDB from "./src/db/db.js"
import Todo from "./src/models/todo.model.js"
import { randomUUID } from "node:crypto"
import { Server } from "socket.io";
import { createServer } from "http";

const port = process.env.PORT || 3000
const categories = new Set(["Personal", "Work", "Wellness", "Learning"])
const priorities = new Set(["normal", "high"])
const todoFields = new Set(["title", "notes", "category", "priority", "dueDate", "completed"])

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

function acknowledge(callback, result) {
  if (typeof callback === "function") callback(result)
}

function isValidDate(value) {
  if (value === "") return true
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

function validateTodoFields(fields, current = {}) {
  const next = { ...current }

  if (!("title" in fields) && !current.title) return { error: "Task names are required." }
  if ("title" in fields) {
    if (typeof fields.title !== "string" || !fields.title.trim() || fields.title.trim().length > 120) {
      return { error: "Task names must be between 1 and 120 characters." }
    }
    next.title = fields.title.trim()
  }
  if ("notes" in fields) {
    if (typeof fields.notes !== "string" || fields.notes.length > 500) return { error: "Task notes must be 500 characters or fewer." }
    next.notes = fields.notes.trim()
  }
  if ("category" in fields) {
    if (!categories.has(fields.category)) return { error: "Choose a valid task area." }
    next.category = fields.category
  }
  if ("priority" in fields) {
    if (!priorities.has(fields.priority)) return { error: "Choose a valid task priority." }
    next.priority = fields.priority
  }
  if ("dueDate" in fields) {
    if (!isValidDate(fields.dueDate)) return { error: "Enter a valid due date." }
    next.dueDate = fields.dueDate
  }
  if ("completed" in fields) {
    if (typeof fields.completed !== "boolean") return { error: "Task completion must be true or false." }
    next.completed = fields.completed
  }
  return { todo: next }
}

async function sendTodos(socket) {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 }).lean()
    socket.emit("todos-snapshot", todos)
  } catch (error) {
    console.error("Could not load todos:", error)
    socket.emit("todo-error", { message: "Tasks could not be loaded." })
  }
}

io.on("connection", (socket) => {
  void sendTodos(socket)
  socket.on("get-todos", () => void sendTodos(socket))

  socket.on("add-todo", async (data, callback) => {
    if (!data || typeof data !== "object") return acknowledge(callback, { ok: false, error: "Invalid task details." })
    const result = validateTodoFields(data)
    if (result.error) return acknowledge(callback, { ok: false, error: result.error })

    const id = typeof data.id === "string" && data.id.trim() && data.id.length <= 100 ? data.id : randomUUID()
    try {
      const todo = await Todo.create({
        id,
        title: result.todo.title,
        notes: result.todo.notes || "",
        category: result.todo.category || "Personal",
        priority: result.todo.priority || "normal",
        dueDate: result.todo.dueDate || "",
        completed: false,
      })
      const savedTodo = todo.toObject()
      io.emit("todo-added", savedTodo)
      acknowledge(callback, { ok: true, todo: savedTodo })
    } catch (error) {
      console.error("Could not save todo:", error)
      acknowledge(callback, { ok: false, error: "That task could not be saved." })
    }
  })

  socket.on("update-todo", async (data, callback) => {
    if (!data || typeof data.id !== "string" || !data.changes || typeof data.changes !== "object" || Array.isArray(data.changes)) {
      return acknowledge(callback, { ok: false, error: "Invalid task update." })
    }
    if (Object.keys(data.changes).some((key) => !todoFields.has(key)) || Object.keys(data.changes).length === 0) {
      return acknowledge(callback, { ok: false, error: "Choose valid task details to update." })
    }
    try {
      const current = await Todo.findOne({ id: data.id }).lean()
      if (!current) return acknowledge(callback, { ok: false, error: "That task no longer exists." })

      const result = validateTodoFields(data.changes, current)
      if (result.error) return acknowledge(callback, { ok: false, error: result.error })
      const changes = Object.fromEntries(
        Object.keys(data.changes).map((key) => [key, result.todo[key]])
      )
      const updatedTodo = await Todo.findOneAndUpdate(
        { id: data.id },
        { $set: changes },
        { new: true, runValidators: true },
      ).lean()
      if (!updatedTodo) return acknowledge(callback, { ok: false, error: "That task no longer exists." })
      io.emit("todo-updated", updatedTodo)
      acknowledge(callback, { ok: true, todo: updatedTodo })
    } catch (error) {
      console.error("Could not update todo:", error)
      acknowledge(callback, { ok: false, error: "That task could not be updated." })
    }
  })

  socket.on("delete-todo", async (data, callback) => {
    if (!data || typeof data.id !== "string") return acknowledge(callback, { ok: false, error: "Invalid task." })
    try {
      const deletedTodo = await Todo.findOneAndDelete({ id: data.id }).lean()
      if (!deletedTodo) return acknowledge(callback, { ok: false, error: "That task no longer exists." })
      io.emit("todo-deleted", { id: data.id })
      acknowledge(callback, { ok: true })
    } catch (error) {
      console.error("Could not delete todo:", error)
      acknowledge(callback, { ok: false, error: "That task could not be deleted." })
    }
  })

  socket.on("clear-completed", async (callback) => {
    try {
      await Todo.deleteMany({ completed: true })
      io.emit("todos-cleared")
      acknowledge(callback, { ok: true })
    } catch (error) {
      console.error("Could not clear completed todos:", error)
      acknowledge(callback, { ok: false, error: "Completed tasks could not be cleared." })
    }
  })
});

connectDB()

httpServer.listen(port, () => {
  console.log(`Daymark listening on port ${port}`)
})