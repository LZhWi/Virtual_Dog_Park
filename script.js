const form = document.querySelector("#adoption-form");
const panel = document.querySelector("#pet-panel");
const nameInput = document.querySelector("#dog-name");
const nameError = document.querySelector("#name-error");
let dog = null;

function renderDog() {
  form.hidden = dog !== null;
  panel.hidden = dog === null;
  if (dog === null) return;

  // User-entered names are displayed as text.
  document.querySelector("#pet-name").textContent = dog.name;
  document.querySelector("#pet-breed").textContent = dog.breed;
  document.querySelector("#pet-day").textContent = dog.day;
  document.querySelector("#pet-stage").textContent = "Puppy";
  document.querySelector("#pet-happiness").textContent = dog.happiness;
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
  renderDog();
});

function careForDog() {
  dog.happiness = Math.min(100, dog.happiness + 10);
  renderDog();
}

document.querySelector("#feed").addEventListener("click", careForDog);
document.querySelector("#play").addEventListener("click", careForDog);
