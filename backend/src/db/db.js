import dns from 'node:dns/promises'
dns.setServers(['1.1.1.1','8.8.8.8'])
import chalk from 'chalk';

import mongoose from "mongoose"
main().catch(err => console.log(err));

async function main() {
  try{
    await mongoose.connect('mongodb+srv://umrabadar55_db_user:VJXbAtGiYJkKj0cb@cluster0.bfhjuob.mongodb.net/users');
  console.log(chalk.white.bgGreen.bold("Connected to DB"));
  }catch(err){
    console.log(chalk.blue.bgRed.bold("Error connecting to DB"), err);
  }
}
export default main