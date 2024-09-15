require("dotenv").config();
const { createClient } = require("@libsql/client");
const { getTaskDeadlineStatus } = require("./util.js");
const amqp = require("amqplib");

const main = async () => {
  //connect with db client
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const mq_connection = await amqp.connect(process.env.MQ_CONNECTION_URL);
  const channel = await mq_connection.createChannel();

  const queue = process.env.QUEUE;

  await channel.assertQueue(queue, {
    durable: true,
  });

  const today = new Date();

  // get tasks whose deadlines are close
  const result = await turso.execute(
    `select * from "tasks" as t 
    join "assigned_task_details" as a on a.task_id = t.id  
    join users as u on u.id = a.user_id  
    where 
    DATE(task_deadline) BETWEEN DATE('now') AND DATE('now', '+3 days') and task_progress <> "Done" 
    or DATE(task_deadline) = DATE('now', '-1 day') and task_progress <> "Done" 
    or DATE(task_deadline) = DATE('now', '-3 days') and task_progress <> "Done" 
    or DATE(task_deadline) = DATE('now', '-7 days') and task_progress <> "Done" 
    `
  );
  const tasksWithUsers = result.rows;

  // insert notification details concurrently
  await Promise.all(
    tasksWithUsers.map(async (taskwithUser) => {
      try {
        const response = await turso.execute(
          ` insert into notifications (user_id , task_id, notifed_at, description)
          values (?,?,?,?) returning *
          `,
          [
            taskwithUser.user_id,
            taskwithUser.task_id,
            today.toISOString(),
            getTaskDeadlineStatus(
              taskwithUser.title,
              taskwithUser.task_deadline
            ),
          ]
        );
        const [notification] = response.rows;

        if (!notification) {
          console.log(`there isnt any notification`);
        }
        //send message to the queue
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(notification)), {
          persistent: true,
        });
        console.log(
          `notification:(${notification.id})ID  has been sent to ${queue}`
        );
      } catch (err) {
        console.log(err);
        await channel.close();
        await mq_connection.close();
      }
    })
  );

  await channel.close();
  await mq_connection.close();
};

main();
