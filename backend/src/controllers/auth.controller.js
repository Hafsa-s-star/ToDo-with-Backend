import userModel from "../models/users.model.js";
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

async function registerUser(req, res) {
   try {
    const { username,email, password,role } = req.body;

    const userAlreadyExists= await userModel.findOne({
        $or:[
            {username},
            {email}
        ]
    })

    if(userAlreadyExists){
        return res.status(409).json({
            message:"User Already Exists"
        })
    }

    const hash = await bcrypt.hash(password, 10);

    const user= await userModel.create({username,email, password:hash,role})
    const token= jwt.sign({
        id: user._id,
        role: user.role
    },"0ed127bf813f2f9224813e45631b1571")

    res.cookie("token",token)

    res.status(201).json({
        message:"User created sucessfully",
        user, token
    })
   } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
    
   }
}

async function loginUser(req, res) {
    const {username, email, password } = req.body;
    const user = await userModel.findOne({
        $or:[
            {username},
            {email}
        ]
    })

    if(!user){
        return res.status(404).json({
            message:"User not found"
        })
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if(!isPasswordValid){
        return res.status(401).json({
            message:"Invalid password"
        })
    }

    const token= jwt.sign({
        id: user._id,
        role: user.role
    },"0ed127bf813f2f9224813e45631b1571")

    res.cookie("token",token)

    res.status(200).json({
        message:"User logged in sucessfully",
        user, token
    })

}
export { registerUser , loginUser}