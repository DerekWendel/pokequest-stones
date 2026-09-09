import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../public/assets/pokemon');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Full 151 Pokémon Name mapping
const POKEMON_151 = [
  { id: 1, name: "Bulbasaur", file: "Bulbasaur.png" },
  { id: 2, name: "Ivysaur", file: "Ivysaur.png" },
  { id: 3, name: "Venusaur", file: "Venusaur.png" },
  { id: 4, name: "Charmander", file: "Charmander.png" },
  { id: 5, name: "Charmeleon", file: "Charmeleon.png" },
  { id: 6, name: "Charizard", file: "Charizard.png" },
  { id: 7, name: "Squirtle", file: "Squirtle.png" },
  { id: 8, name: "Wartortle", file: "Wartortle.png" },
  { id: 9, name: "Blastoise", file: "Blastoise.png" },
  { id: 10, name: "Caterpie", file: "Caterpie.png" },
  { id: 11, name: "Metapod", file: "Metapod.png" },
  { id: 12, name: "Butterfree", file: "Butterfree.png" },
  { id: 13, name: "Weedle", file: "Weedle.png" },
  { id: 14, name: "Kakuna", file: "Kakuna.png" },
  { id: 15, name: "Beedrill", file: "Beedrill.png" },
  { id: 16, name: "Pidgey", file: "Pidgey.png" },
  { id: 17, name: "Pidgeotto", file: "Pidgeotto.png" },
  { id: 18, name: "Pidgeot", file: "Pidgeot.png" },
  { id: 19, name: "Rattata", file: "Rattata.png" },
  { id: 20, name: "Raticate", file: "Raticate.png" },
  { id: 21, name: "Spearow", file: "Spearow.png" },
  { id: 22, name: "Fearow", file: "Fearow.png" },
  { id: 23, name: "Ekans", file: "Ekans.png" },
  { id: 24, name: "Arbok", file: "Arbok.png" },
  { id: 25, name: "Pikachu", file: "Pikachu.png" },
  { id: 26, name: "Raichu", file: "Raichu.png" },
  { id: 27, name: "Sandshrew", file: "Sandshrew.png" },
  { id: 28, name: "Sandslash", file: "Sandslash.png" },
  { id: 29, name: "Nidoran♀", file: "Nidoran-female.png", fallbackFile: "Nidoran♀.png" },
  { id: 30, name: "Nidorina", file: "Nidorina.png" },
  { id: 31, name: "Nidoqueen", file: "Nidoqueen.png" },
  { id: 32, name: "Nidoran♂", file: "Nidoran-male.png", fallbackFile: "Nidoran♂.png" },
  { id: 33, name: "Nidorino", file: "Nidorino.png" },
  { id: 34, name: "Nidoking", file: "Nidoking.png" },
  { id: 35, name: "Clefairy", file: "Clefairy.png" },
  { id: 36, name: "Clefable", file: "Clefable.png" },
  { id: 37, name: "Vulpix", file: "Vulpix.png" },
  { id: 38, name: "Ninetales", file: "Ninetales.png" },
  { id: 39, name: "Jigglypuff", file: "Jigglypuff.png" },
  { id: 40, name: "Wigglytuff", file: "Wigglytuff.png" },
  { id: 41, name: "Zubat", file: "Zubat.png" },
  { id: 42, name: "Golbat", file: "Golbat.png" },
  { id: 43, name: "Oddish", file: "Oddish.png" },
  { id: 44, name: "Gloom", file: "Gloom.png" },
  { id: 45, name: "Vileplume", file: "Vileplume.png" },
  { id: 46, name: "Paras", file: "Paras.png" },
  { id: 47, name: "Parasect", file: "Parasect.png" },
  { id: 48, name: "Venonat", file: "Venonat.png" },
  { id: 49, name: "Venomoth", file: "Venomoth.png" },
  { id: 50, name: "Diglett", file: "Diglett.png" },
  { id: 51, name: "Dugtrio", file: "Dugtrio.png" },
  { id: 52, name: "Meowth", file: "Meowth.png" },
  { id: 53, name: "Persian", file: "Persian.png" },
  { id: 54, name: "Psyduck", file: "Psyduck.png" },
  { id: 55, name: "Golduck", file: "Golduck.png" },
  { id: 56, name: "Mankey", file: "Mankey.png" },
  { id: 57, name: "Primeape", file: "Primeape.png" },
  { id: 58, name: "Growlithe", file: "Growlithe.png" },
  { id: 59, name: "Arcanine", file: "Arcanine.png" },
  { id: 60, name: "Poliwag", file: "Poliwag.png" },
  { id: 61, name: "Poliwhirl", file: "Poliwhirl.png" },
  { id: 62, name: "Poliwrath", file: "Poliwrath.png" },
  { id: 63, name: "Abra", file: "Abra.png" },
  { id: 64, name: "Kadabra", file: "Kadabra.png" },
  { id: 65, name: "Alakazam", file: "Alakazam.png" },
  { id: 66, name: "Machop", file: "Machop.png" },
  { id: 67, name: "Machoke", file: "Machoke.png" },
  { id: 68, name: "Machamp", file: "Machamp.png" },
  { id: 69, name: "Bellsprout", file: "Bellsprout.png" },
  { id: 70, name: "Weepinbell", file: "Weepinbell.png" },
  { id: 71, name: "Victreebel", file: "Victreebel.png" },
  { id: 72, name: "Tentacool", file: "Tentacool.png" },
  { id: 73, name: "Tentacruel", file: "Tentacruel.png" },
  { id: 74, name: "Geodude", file: "Geodude.png" },
  { id: 75, name: "Graveler", file: "Graveler.png" },
  { id: 76, name: "Golem", file: "Golem.png" },
  { id: 77, name: "Ponyta", file: "Ponyta.png" },
  { id: 78, name: "Rapidash", file: "Rapidash.png" },
  { id: 79, name: "Slowpoke", file: "Slowpoke.png" },
  { id: 80, name: "Slowbro", file: "Slowbro.png" },
  { id: 81, name: "Magnemite", file: "Magnemite.png" },
  { id: 82, name: "Magneton", file: "Magneton.png" },
  { id: 83, name: "Farfetch'd", file: "Farfetch-d.png" },
  { id: 84, name: "Doduo", file: "Doduo.png" },
  { id: 85, name: "Dodrio", file: "Dodrio.png" },
  { id: 86, name: "Seel", file: "Seel.png" },
  { id: 87, name: "Dewgong", file: "Dewgong.png" },
  { id: 88, name: "Grimer", file: "Grimer.png" },
  { id: 89, name: "Muk", file: "Muk.png" },
  { id: 90, name: "Shellder", file: "Shellder.png" },
  { id: 91, name: "Cloyster", file: "Cloyster.png" },
  { id: 92, name: "Gastly", file: "Gastly.png" },
  { id: 93, name: "Haunter", file: "Haunter.png" },
  { id: 94, name: "Gengar", file: "Gengar.png" },
  { id: 95, name: "Onix", file: "Onix.png" },
  { id: 96, name: "Drowzee", file: "Drowzee.png" },
  { id: 97, name: "Hypno", file: "Hypno.png" },
  { id: 98, name: "Krabby", file: "Krabby.png" },
  { id: 99, name: "Kingler", file: "Kingler.png" },
  { id: 100, name: "Voltorb", file: "Voltorb.png" },
  { id: 101, name: "Electrode", file: "Electrode.png" },
  { id: 102, name: "Exeggcute", file: "Exeggcute.png" },
  { id: 103, name: "Exeggutor", file: "Exeggutor.png" },
  { id: 104, name: "Cubone", file: "Cubone.png" },
  { id: 105, name: "Marowak", file: "Marowak.png" },
  { id: 106, name: "Hitmonlee", file: "Hitmonlee.png" },
  { id: 107, name: "Hitmonchan", file: "Hitmonchan.png" },
  { id: 108, name: "Lickitung", file: "Lickitung.png" },
  { id: 109, name: "Koffing", file: "Koffing.png" },
  { id: 110, name: "Weezing", file: "Weezing.png" },
  { id: 111, name: "Rhyhorn", file: "Rhyhorn.png" },
  { id: 112, name: "Rhydon", file: "Rhydon.png" },
  { id: 113, name: "Chansey", file: "Chansey.png" },
  { id: 114, name: "Tangela", file: "Tangela.png" },
  { id: 115, name: "Kangaskhan", file: "Kangaskhan.png" },
  { id: 116, name: "Horsea", file: "Horsea.png" },
  { id: 117, name: "Seadra", file: "Seadra.png" },
  { id: 118, name: "Goldeen", file: "Goldeen.png" },
  { id: 119, name: "Seaking", file: "Seaking.png" },
  { id: 120, name: "Staryu", file: "Staryu.png" },
  { id: 121, name: "Starmie", file: "Starmie.png" },
  { id: 122, name: "Mr. Mime", file: "Mr.-Mime.png", fallbackFile: "Mr.Mime.png" },
  { id: 123, name: "Scyther", file: "Scyther.png" },
  { id: 124, name: "Jynx", file: "Jynx.png" },
  { id: 125, name: "Electabuzz", file: "Electabuzz.png" },
  { id: 126, name: "Magmar", file: "Magmar.png" },
  { id: 127, name: "Pinsir", file: "Pinsir.png" },
  { id: 128, name: "Tauros", file: "Tauros.png" },
  { id: 129, name: "Magikarp", file: "Magikarp.png" },
  { id: 130, name: "Gyarados", file: "Gyarados.png" },
  { id: 131, name: "Lapras", file: "Lapras.png" },
  { id: 132, name: "Ditto", file: "Ditto.png" },
  { id: 133, name: "Eevee", file: "Eevee.png" },
  { id: 134, name: "Vaporeon", file: "Vaporeon.png" },
  { id: 135, name: "Jolteon", file: "Jolteon.png" },
  { id: 136, name: "Flareon", file: "Flareon.png" },
  { id: 137, name: "Porygon", file: "Porygon.png" },
  { id: 138, name: "Omanyte", file: "Omanyte.png" },
  { id: 139, name: "Omastar", file: "Omastar.png" },
  { id: 140, name: "Kabuto", file: "Kabuto.png" },
  { id: 141, name: "Kabutops", file: "Kabutops.png" },
  { id: 142, name: "Aerodactyl", file: "Aerodactyl.png" },
  { id: 143, name: "Snorlax", file: "Snorlax.png" },
  { id: 144, name: "Articuno", file: "Articuno.png" },
  { id: 145, name: "Zapdos", file: "Zapdos.png" },
  { id: 146, name: "Moltres", file: "Moltres.png" },
  { id: 147, name: "Dratini", file: "Dratini.png" },
  { id: 148, name: "Dragonair", file: "Dragonair.png" },
  { id: 149, name: "Dragonite", file: "Dragonite.png" },
  { id: 150, name: "Mewtwo", file: "Mewtwo.png" },
  { id: 151, name: "Mew", file: "Mew.png" },
];

const baseUrl = 'https://raw.githubusercontent.com/gianemi2/pokemon-quest-recipes-maker/master/assets/pokemon-image/';

async function downloadAll() {
  console.log(`Downloading ${POKEMON_151.length} Pokemon Quest face icons...`);
  let successCount = 0;

  for (const poke of POKEMON_151) {
    const targetPath = path.join(outDir, `${poke.id}.png`);
    const encodedFile = encodeURIComponent(poke.file);
    const url = `${baseUrl}${encodedFile}`;

    try {
      let res = await fetch(url);
      if (!res.ok && poke.fallbackFile) {
        const fbUrl = `${baseUrl}${encodeURIComponent(poke.fallbackFile)}`;
        res = await fetch(fbUrl);
      }

      if (!res.ok) {
        console.error(`Failed to download #${poke.id} ${poke.name} from ${url} (status: ${res.status})`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);
      successCount++;
    } catch (err) {
      console.error(`Error downloading #${poke.id} ${poke.name}:`, err.message);
    }
  }

  console.log(`Done! Successfully downloaded ${successCount} / ${POKEMON_151.length} Pokemon Quest face icons to ${outDir}`);
}

downloadAll();
