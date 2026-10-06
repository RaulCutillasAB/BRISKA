# BRISKA · naipes bajo las estrellas

Un *roguelike* de construcción de mazos con la **baraja española**. Juega manos de póker con Oros, Copas, Espadas y Bastos, colecciona **Talismanes** que rompen las reglas, y sobrevive a las ocho Noches custodiadas por sus **Guardianes**.

> Arte, música, sonido, nombres y reglas originales. Todo se genera con código (SVG, WebGL y Web Audio): no hay imágenes ni audio de terceros.

## Cómo jugar

Abre `index.html` en cualquier navegador moderno (no necesita servidor ni instalación), o usa la versión de un solo archivo `dist/briska.html`.

- Cada **Noche** tiene tres envites: *Menor*, *Mayor* y un **Guardián** con una regla maldita.
- Selecciona hasta 5 cartas y juega una mano. Puntuación = **Fichas × Mult**.
- **As 11, Tres 10, Rey 10, Caballo 9, Sota 8**; el resto vale su número (en la brisca, ¡el tres manda!).
- Las escaleras siguen el orden A·2·3·4·5·6·7·Sota·Caballo·Rey·A.
- **Triunfo**: cada ronda hay un palo de triunfo; sus cartas dan +1 Mult.
- **Cantes**: Caballo y Rey del mismo palo cantan *Las Veinte* (+20 Fichas). En el palo de triunfo… **¡Las Cuarenta!** (+40).
- Entre envites, visita **La Feria**: Talismanes, Augurios, Constelaciones, Sobres y Privilegios.

Atajos: `Enter` jugar · `X` descartar · `R`/`P` ordenar por valor/palo · `Esc` opciones. Arrastra cartas y talismanes para reordenarlos (el orden de los talismanes importa).

## Contenido

| | |
|---|---|
| Talismanes | 93 (comunes, infrecuentes, raros y legendarios) |
| Augurios | 23 |
| Constelaciones | 12 (incluidas 3 manos secretas) |
| Ánimas | 16 |
| Privilegios | 24 |
| Guardianes | 25 (4 finales) |
| Insignias | 14 |
| Barajas | 11 desbloqueables |
| Dificultades | 6 velas |
| Logros | 25 |

Además: modo infinito tras ganar, **Reto del día** con semilla compartida, Grimorio de descubrimientos, estadísticas y guardado automático.

## Estructura

```
index.html          punto de entrada
css/style.css       estilos y animaciones
js/core/            reglas del juego, sin DOM (se puede ejecutar en Node)
  rng.js data.js hands.js talismans.js consumables.js scoring.js game.js meta.js
js/ui/              arte SVG, iconos, audio, fondo WebGL, partículas, vista y pantallas
js/main.js          controlador: une núcleo, vista y pantallas
tools/              tests, simuladores de partidas y build
```

## Desarrollo

```bash
node tools/test.js        # tests del motor de reglas
node tools/sim2.js 30     # un bot juega 30 partidas para medir el equilibrio
node tools/build.js       # genera dist/briska.html (un solo archivo)
```
