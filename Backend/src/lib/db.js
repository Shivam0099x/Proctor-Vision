import mongoose from "mongoose"

export const connectDB = async ()=>{
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        if(!conn) {
            console.log(`Connot connect with db`)
            return
        }

        console.log(`Db connected successfully. Host => ${conn.connection.host}`)
        
    } catch (error) {
        console.log(`Error while connecting to db ${error.message}`)
        process.exit(1)
    }
}