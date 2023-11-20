const express = require("express");
const schedule = require("node-schedule");
const ZKLib = require("node-zklib");
const dotend = require("dotenv");

const app = express();

// Configurar variables de entorno
dotend.config();

let fetch;
try {
  fetch = require("node-fetch");
} catch (err) {
  fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

// Configurar puerto
const PORT_FINGERPRINT = process.env.PORT_FINGERPRINT || 4370;
const IP_FINGERPRINT = process.env.IP_FINGERPRINT || "192.168.1.201";
const API = process.env.API;

const PORT_NODE = process.env.PORT_NODE || 3000;

// Definir tareas programadas
const scheduleTasks = () => {
  const tasks = [
    { time: "0 8 * * *", message: "Tarea a las 8 AM" },
    { time: "0 12 * * *", message: "Tarea a las 12 PM" },
    { time: "0 17 * * *", message: "Tarea a las 5 PM" },
    { time: "0 19 * * *", message: "Tarea a las 7 PM" }
    // { time: "39 14 * * *", message: "Tarea a las 1:48 PM" }
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
  // scheduleTasks();
  // getFingerPrintData();

  let eventsLogs = [];
  eventsLogs.push({
    type: "error",
    message: "Error al crear el socket"
  });
  sendLogs(eventsLogs, "fingerprints/logs");
});

// extraccion de datos del lector de huella function
const getFingerPrintData = async () => {
  let zkInstance = new ZKLib(IP_FINGERPRINT, PORT_FINGERPRINT, 5200, 5000);
  let data = {};

  let eventsLogs = [];

  try {
    // Create socket to machine
    await zkInstance.createSocket();

    // Get general info like logCapacity, user counts, logs count
    // It's really useful to check the status of device
    // console.log(await zkInstance.getInfo());
  } catch (e) {
    console.log("datos error:", e);
    eventsLogs.push({
      type: "error",
      message: "Error al crear el socket",
      error: e
    });
    await sendLogs(JSON.stringify(eventsLogs), "fingerprints/logs");
    return;
  }

  // Get users in machine
  const users = await zkInstance.getUsers();
  data = users;

  // Get all logs in the machine
  // Currently, there is no filter to take data, it just takes all !!
  try {
    const logs = await zkInstance.getAttendances();
    data = logs;
  } catch (error) {
    console.log("Error al obtener los logs de asistencia");
    eventsLogs.push({
      type: "error",
      message: "Error al obtener los logs de asistencia",
      error: error
    });
  }

  if (data.length > 0) await sendLogs(data, "fingerprints");
  if (eventsLogs.length > 0) await sendLogs(eventsLogs, "fingerprints/logs");

  // Delete the data in machine
  // Note: You should do this when there are too many data in the machine,
  // this issue can slow down machine.
  // zkInstance.clearAttendanceLog();

  // Disconnect the machine ( don't do this when you need realtime update :)))
  await zkInstance.disconnect();
};

const sendLogs = async (logs, url) => {
  try {
    const response = await fetch(`${API}/${url}`, {
      method: "POST",
      body: JSON.stringify(logs),
      headers: {
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();

    if (data.success) console.log("Logs enviados a la API");
  } catch (error) {
    console.log("Error al enviar los logs a la api");
  }
};
