# LAZO · una luciérnaga contra la noche

Un roguelike de acción original: no disparas ni juegas cartas. **Vuelas dejando una estela de luz, y cuando la cruzas cierras un lazo**: todas las sombras que queden dentro reciben daño. Cuantas más atrapes de golpe, mayor el combo.

## Cómo se juega

Abre `index.html` en el navegador (o `dist/lazo.html`, un único archivo). No necesita instalación.

- **Moverse**: ratón, flechas/WASD o arrastrando el dedo.
- **Impulso** (esquiva con invulnerabilidad): clic, Espacio o el botón del rayo en móvil.
- **Pausa**: Esc o P.

Cada partida recorre tres noches (Bosque de Luciérnagas, Pantano de Niebla y Cielo Eclipse). Cada una es un mapa de caminos con salas de sombras, sombras mayores, tesoros, mercados, manantiales y misterios, y termina con un Guardián.

## Contenido

- 33 dones con sinergias (estelas ardientes, ecos, supernovas, lazos perpetuos, estela gemela…)
- 10 tipos de sombra y 3 Guardianes con patrones propios
- 8 eventos con decisiones
- 5 luciérnagas desbloqueables y 6 lunas de dificultad
- 14 logros, diario de descubrimientos y estadísticas
- Música generativa y efectos sintetizados en el propio navegador

Todo el arte, el sonido y el diseño son originales y se generan por código.

## Desarrollo

```bash
node tools/test.js      # pruebas de la simulación
node tools/sim.js 40 2  # un bot juega 40 partidas para medir la dificultad
node tools/build.js     # genera dist/lazo.html
```
