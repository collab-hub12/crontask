require("dotenv").config();
const { createClient } = require("@libsql/client");
const { getTaskDeadlineStatus } = require("./util.js");

const main = async () => {
  //connect with db client
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
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
  Promise.all(
    tasksWithUsers.map((taskwithUser) => {
      return turso.execute(
        ` insert into notifications (user_id , task_id, notifed_at, description)
          values (?,?,?,?)
          `,
        [
          taskwithUser.user_id,
          taskwithUser.task_id,
          today.toISOString(),
          getTaskDeadlineStatus(taskwithUser.title, taskwithUser.task_deadline),
        ]
      );
    })
  );
};

main();
