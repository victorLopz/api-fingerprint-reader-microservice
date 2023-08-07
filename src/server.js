const express = require("express");
const schedule = require("node-schedule");
const ZKLib = require("node-zklib");
const dotend = require("dotenv");
const fs = require("fs");

const app = express();

// Configurar variables de entorno
dotend.config();

// Configurar puerto
const PORT_FINGERPRINT = process.env.PORT_FINGERPRINT;
const IP_FINGERPRINT = process.env.IP_FINGERPRINT;

const PORT_NODE = process.env.PORT_NODE || 3000;

// Definir tareas programadas
const scheduleTasks = () => {
  const tasks = [
    { time: "0 8 * * *", message: "Tarea a las 8 AM" },
    { time: "0 12 * * *", message: "Tarea a las 12 PM" },
    { time: "0 17 * * *", message: "Tarea a las 5 PM" },
    { time: "0 19 * * *", message: "Tarea a las 7 PM" },
    { time: "39 14 * * *", message: "Tarea a las 1:48 PM" }
  ];

  const runTask = (message) => {
    console.log(message);
    getFingerPrintData();
  };

  tasks.forEach((task) => {
    const { time, message } = task;
    schedule.scheduleJob(time, () => {
      runTask(message);
    });
  });
};

// Iniciar servidor y programar tareas
app.listen(PORT_NODE, () => {
  console.log(`Servidor Express corriendo en el puerto ${PORT_NODE}`);
  scheduleTasks();
  getFingerPrintData();
});

// extraccion de datos del lector de huella function
const getFingerPrintData = async () => {
  let zkInstance = new ZKLib(IP_FINGERPRINT, PORT_FINGERPRINT, 5200, 5000);
  try {
    // Create socket to machine
    await zkInstance.createSocket();

    // Get general info like logCapacity, user counts, logs count
    // It's really useful to check the status of device
    // console.log(await zkInstance.getInfo());

  } catch (e) {
    console.log(e);
    throw e;
  }

  // Get users in machine
  const users = await zkInstance.getUsers();
  // fs.writeFile(
  //   "users.json",
  //   JSON.stringify(users, null, 2) ?? "",
  //   function (err) {
  //     if (err) throw err;
  //     console.log("Users Saved!");
  //   }
  // );

  // Get all logs in the machine
  // Currently, there is no filter to take data, it just takes all !!
  try {
    const logs = await zkInstance.getAttendances();

    // crear un archivo con los datos de los logs de asistencia .txt
    // fs.writeFile(
    //   "logs.json",
    //   JSON.stringify(logs, null, 2) ?? "",
    //   function (err) {
    //     if (err) throw err;
    //     console.log("Logs Saved!");
    //   }
    // );
  } catch (error) {
    console.log("Error al obtener los logs de asistencia");
  }

  // Delete the data in machine
  // Note: You should do this when there are too many data in the machine,
  // this issue can slow down machine.
  zkInstance.clearAttendanceLog();

  // Disconnect the machine ( don't do this when you need realtime update :)))
  await zkInstance.disconnect();
};
