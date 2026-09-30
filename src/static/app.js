document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantItem(email, activity) {
    const listItem = document.createElement("li");
    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = email;

    const unregisterButton = document.createElement("button");
    unregisterButton.type = "button";
    unregisterButton.className = "unregister-button";
    unregisterButton.dataset.activity = activity;
    unregisterButton.dataset.email = email;
    unregisterButton.setAttribute("aria-label", `Remove ${email} from ${activity}`);
    unregisterButton.title = `Remove ${email} from ${activity}`;
    unregisterButton.textContent = "×";

    listItem.append(participantEmail, unregisterButton);
    return listItem;
  }

  function updateActivityAvailability(activityCard) {
    const participantCount = activityCard.querySelector(".participants-list").children.length;
    const spotsLeft = Number(activityCard.dataset.maxParticipants) - participantCount;
    activityCard.querySelector(".availability").textContent = `${spotsLeft} spots left`;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activity = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="availability">${spotsLeft} spots left</span></p>
          <p class="participants-heading"><strong>Participants:</strong></p>
        `;

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";
        details.participants.forEach((participant) => {
          participantsList.appendChild(createParticipantItem(participant, name));
        });
        activityCard.appendChild(participantsList);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        const activityCard = Array.from(activitiesList.children).find(
          (card) => card.dataset.activity === activity
        );
        if (activityCard) {
          const participantsList = activityCard.querySelector(".participants-list");
          participantsList.appendChild(createParticipantItem(email, activity));
          updateActivityAvailability(activityCard);
        }

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const unregisterButton = event.target.closest(".unregister-button");
    if (!unregisterButton || unregisterButton.disabled) {
      return;
    }

    const { activity, email } = unregisterButton.dataset;
    unregisterButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "An error occurred");
      }

      const activityCard = unregisterButton.closest(".activity-card");
      unregisterButton.closest("li").remove();
      updateActivityAvailability(activityCard);
      messageDiv.textContent = result.message;
      messageDiv.className = "success";
    } catch (error) {
      unregisterButton.disabled = false;
      messageDiv.textContent = error.message || "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      console.error("Error unregistering participant:", error);
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  });

  // Initialize app
  fetchActivities();
});
