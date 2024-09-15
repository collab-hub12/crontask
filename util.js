const formateDate = (date) => {
  return date.toISOString().split("T")[0];
};

function getTaskDeadlineStatus(taskTitle, taskDeadline) {
  // Get the current date
  const today = new Date();

  // Convert the taskDeadline to a Date object
  const deadlineDate = new Date(taskDeadline);

  // Calculate the time difference in milliseconds
  const timeDiff = deadlineDate - today;

  // Convert time difference from milliseconds to days
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Determine the status based on daysDiff
  let status;
  if (daysDiff > 0) {
    status = `Task "${taskTitle}" is due in ${daysDiff} days.`;
  } else if (daysDiff === 0) {
    status = `Task "${taskTitle}" is due Today.`;
  } else {
    status = `Task "${taskTitle}" deadline passed by ${Math.abs(
      daysDiff
    )} days.`;
  }

  return status;
}

module.exports = { formateDate, getTaskDeadlineStatus };
