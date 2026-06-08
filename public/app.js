const form = document.querySelector("#lookup-form");
const usernameInput = document.querySelector("#username");
const statusText = document.querySelector("#status");
const profileCard = document.querySelector("#profile-card");
const avatar = document.querySelector("#avatar");
const profileName = document.querySelector("#profile-name");
const profileHandle = document.querySelector("#profile-handle");
const followers = document.querySelector("#followers");
const submitButton = form.querySelector("button");

const formatter = new Intl.NumberFormat("uk-UA");

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Шукаю..." : "Перевірити";
}

function cleanUsername(value) {
  return value.trim().replace(/^@/, "");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = cleanUsername(usernameInput.value);
  profileCard.hidden = true;

  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) {
    setStatus("Username має містити 1-15 символів: літери, цифри або underscore.", true);
    return;
  }

  setLoading(true);
  setStatus("Підключаюся до X...");

  try {
    const response = await fetch(`/api/x-user?username=${encodeURIComponent(username)}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося отримати дані.");
    }

    avatar.src = payload.avatarUrl;
    avatar.alt = `Аватар ${payload.username}`;
    profileName.textContent = payload.name || payload.username;
    profileHandle.textContent = `@${payload.username}`;
    followers.textContent = formatter.format(payload.followers);
    profileCard.hidden = false;
    setStatus(payload.source === "official_api" ? "Дані отримано через X API." : "Дані отримано з публічного джерела.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
});
