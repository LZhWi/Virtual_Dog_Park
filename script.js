const form = document.querySelector("#adoption-form");
const panel = document.querySelector("#pet-panel");
const nameInput = document.querySelector("#dog-name");
const nameError = document.querySelector("#name-error");
const storageKey = "virtualDogParkPetV1";
const breeds = ["Beagle", "Golden Retriever", "Poodle"];
const stages = ["Puppy", "Young Dog", "Adult Dog"];
let dog = loadDog();

function loadDog() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (
      saved && typeof saved.name === "string" &&
      saved.name.trim().length > 0 && saved.name.length <= 20 &&
      breeds.includes(saved.breed) &&
      Number.isInteger(saved.day) && saved.day >= 1 &&
      Number.isInteger(saved.happiness) && saved.happiness >= 0 && saved.happiness <= 100
    ) {
      return saved;
    }
  } catch {
    // An unreadable saved record should still allow a fresh adoption.
  }
  return null;
}

function stageFor(day) {
  if (day === 1) return "Puppy";
  if (day <= 3) return "Young Dog";
  return "Adult Dog";
}

function renderDog() {
  form.hidden = dog !== null;
  panel.hidden = dog === null;
  if (dog === null) return;

  // User-entered names are displayed as text.
  document.querySelector("#pet-name").textContent = dog.name;
  document.querySelector("#pet-breed").textContent = dog.breed;
  document.querySelector("#pet-day").textContent = dog.day;
  const stage = stageFor(dog.day);
  document.querySelector("#pet-stage").textContent = stage;
  document.querySelector("#growth").value = stages.indexOf(stage) + 1;
  document.querySelector("#pet-happiness").textContent = dog.happiness;
}

function saveAndRender() {
  localStorage.setItem(storageKey, JSON.stringify(dog));
  renderDog();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (name.length === 0 || name.length > 20) {
    nameError.textContent = "Please enter a name with 1 to 20 characters.";
    nameInput.focus();
    return;
  }

  nameError.textContent = "";
  dog = {
    name,
    breed: document.querySelector("#breed").value,
    day: 1,
    happiness: 50,
  };
  saveAndRender();
});

function careForDog() {
  dog.happiness = Math.min(100, dog.happiness + 10);
  saveAndRender();
}

document.querySelector("#feed").addEventListener("click", careForDog);
document.querySelector("#play").addEventListener("click", careForDog);

document.querySelector("#next-day").addEventListener("click", () => {
  dog.day += 1;
  dog.happiness = Math.max(0, dog.happiness - 5);
  saveAndRender();
});

document.querySelector("#start-over").addEventListener("click", () => {
  if (!confirm("Start over? Your saved dog and progress will be deleted.")) return;
  localStorage.removeItem(storageKey);
  dog = null;
  form.reset();
  nameError.textContent = "";
  renderDog();
  nameInput.focus();
});

renderDog();
