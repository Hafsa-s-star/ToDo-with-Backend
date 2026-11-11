import mongoose from "mongoose"

const userSchema= new mongoose.Schema({
    username:{
        type: String,
        unique: true,
        required:true
    },
    email:  {
        type: String,
        unique: true,
        required:true
    },
    password: {
        type: String,
        required:true
    },
    role:{
        type: String,
        default: "user",
        enum:["user","admin"]
    },
    cart:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"product",
            required:true
        },
        quantity:{
            type:Number,
            required:true,
            min:1,
            default:1
        }
    }]
})
const userModel = mongoose.model("user",userSchema)
export default userModel
