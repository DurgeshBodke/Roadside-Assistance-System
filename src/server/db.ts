import mongoose from "mongoose";

let connected = false;

export async function connect() {
  if (connected) return;

  await mongoose.connect(process.env.MONGO_URI as string);

  connected = true;

  console.log("MongoDB Connected");
}