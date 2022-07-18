import * as dotenv from 'dotenv';
import * as fs from 'fs';


dotenv.config();

// temp settings for testing
export const username = String(process.env.USERNAME);
export const password = String(process.env.PASSWORD);
export const deviceName = 'js-testing';

// temp logger
export class Logger {
  logFile = './messages.log';

  log(message: string){
    fs.appendFile(this.logFile, `${Date()}: ${message}\n`, err => {
      if (err){
        throw Error(err.message);
      }
    });
  }
}