// Prompts semilla para que siempre haya algo que responder aunque estés solo.
// Seed prompts so there's always something to answer, even when you're alone.
// Mezcla de ES/EN a propósito. / Intentionally mixed ES/EN.
export const SEED_PROMPTS = [
  "Explícame la computación cuántica como si tuviera 5 años.",
  "Write a haiku about Monday mornings.",
  "Dame 3 ideas para cenar con lo que hay en una nevera medio vacía.",
  "Translate 'I have no idea what I'm doing' into pirate.",
  "¿Por qué el cielo es azul? Responde con confianza aunque no estés seguro.",
  "Give me a motivational quote, but make it slightly threatening.",
  "Escribe un email educado para pedirle a mi vecino que baje la música.",
  "Pretend you're a cat reviewing my homework.",
  "Resume la trama de cualquier película en una sola frase dramática.",
  "What's a good name for a startup that sells umbrellas to fish?",
  "Dame consejos de productividad que en realidad no funcionen.",
  "Explain blockchain using only food metaphors.",
  "Inventa una excusa creíble para llegar tarde al trabajo.",
  "Write the worst possible opening line for a novel.",
  "¿Cómo se hace el café perfecto? Sé innecesariamente intenso.",
  "Describe the internet to a medieval knight.",
  "Dame un nombre épico para mi planta de interior.",
  "Roast my decision to stay up until 3am scrolling.",
  "Escribe una nota de amor de parte de mi router wifi.",
  "Convince me that pineapple belongs on pizza in one sentence.",
];

// Prompts temáticos para el "Prompt del día": rotan por fecha, todos responden
// el mismo. Daily themed prompts: rotate by date, everyone answers the same one.
export const DAILY_PROMPTS = [
  "Explicá por qué los lunes existen, como si fuera tu culpa.",
  "Dame una conspiración inofensiva sobre las medias que desaparecen.",
  "Escribí el horóscopo de hoy para alguien que no durmió nada.",
  "Inventá una palabra nueva y su definición. Defendela con tu vida.",
  "Convencé a un gato de que el lunes es un buen día.",
  "Describí internet a alguien de 1850, en una sola frase.",
  "Dame un consejo financiero terrible pero con mucha seguridad.",
  "Escribí la peor frase para abrir una primera cita.",
  "Justificá científicamente por qué merecés una siesta ahora.",
  "Traducí 'no tengo ganas' al idioma más elegante posible.",
  "Dame el nombre de una banda formada por electrodomésticos.",
  "Explicá la gravedad usando solo metáforas de comida.",
  "Escribí una reseña de 5 estrellas para el aire.",
  "Inventá un feriado nuevo y por qué deberíamos tenerlo libre.",
  "Dame una excusa épica para no contestar un mensaje hace 3 días.",
  "Describí tu día como si fuera el trailer de una película.",
  "Convertí 'voy en 5 minutos' en una promesa creíble.",
  "Escribí un haiku sobre el wifi que se cae.",
  "Dale un discurso motivacional a una planta que se está muriendo.",
  "Inventá una ley de la física que solo aplique los domingos.",
];

// Respuestas de ejemplo para que el muro no nazca vacío.
// Example answers so the wall isn't born empty.
export const SEED_FEED = [
  {
    prompt: "Explícame la computación cuántica como si tuviera 5 años.",
    answer:
      "Imagina una moneda girando en el aire: no es cara ni cruz, es las dos a la vez hasta que la atrapas. Los ordenadores cuánticos juegan con un montón de monedas girando. Eso es todo, ahora ve a lavarte los dientes.",
  },
  {
    prompt: "Write a haiku about Monday mornings.",
    answer: "Alarm screams again\nCoffee is my only friend\nWhy do weekends end",
  },
  {
    prompt: "Give me a motivational quote, but make it slightly threatening.",
    answer:
      "You miss 100% of the shots you don't take. And I am keeping count.",
  },
  {
    prompt: "Inventa una excusa creíble para llegar tarde al trabajo.",
    answer:
      "Un pato cruzó la autopista con sus patitos y, como ser humano con valores, paré el coche. La ética no entiende de horarios.",
  },
  {
    prompt: "Pretend you're a cat reviewing my homework.",
    answer:
      "I sat on it. I knocked the pen off the table. 7/10, would nap on again. The margins were adequate for my tail.",
  },
  {
    prompt: "Dame un nombre épico para mi planta de interior.",
    answer:
      "Clorofila, Devoradora de Luz, Primera de su Maceta, La que No Murió en Invierno.",
  },
];
