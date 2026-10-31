# Translations: Home start screen and chat tools

Status: for review by Jonas. There is no translation layer in the code yet (docs/plans/languages.md, way B), so these
strings are still English in `frontend/index.html`. When `frontend/i18n.js` exists, these are the keys' values.
German uses "du". French uses "tu" (TODO: confirm). Spanish is es-ES.

| English | Deutsch | Français | Español |
|---|---|---|---|
| Good morning / afternoon / evening | Guten Morgen / Guten Tag / Guten Abend | Bonjour / Bon après-midi / Bonsoir | Buenos días / Buenas tardes / Buenas noches |
| Up next | Als Nächstes | À suivre | A continuación |
| All to-dos | Alle To-dos | Toutes les tâches | Todas las tareas |
| To-do (title of the full list) | To-do | Tâches | Tareas |
| Add a to-do | To-do hinzufügen | Ajouter une tâche | Añadir una tarea |
| Close to-do list | To-do-Liste schließen | Fermer la liste des tâches | Cerrar la lista de tareas |
| Due today / Due tomorrow | Heute fällig / Morgen fällig | Pour aujourd'hui / Pour demain | Vence hoy / Vence mañana |
| No due date | Kein Fälligkeitsdatum | Sans échéance | Sin fecha límite |
| + To-do: <title> | + To-do: <title> | + Tâche : <title> | + Tarea: <title> |
| + Calendar: <time> | + Kalender: <time> | + Agenda : <time> | + Calendario: <time> |
| Not now | Jetzt nicht | Pas maintenant | Ahora no |
| Added to to-do: <title> | Zu To-dos hinzugefügt: <title> | Ajouté aux tâches : <title> | Añadido a tareas: <title> |
| Added to calendar: <title> | Zum Kalender hinzugefügt: <title> | Ajouté à l'agenda : <title> | Añadido al calendario: <title> |
| Removed from to-do: <title> | Aus To-dos entfernt: <title> | Retiré des tâches : <title> | Quitado de tareas: <title> |
| Undo | Rückgängig | Annuler | Deshacer |
| Open (tool card) | Öffnen | Ouvrir | Abrir |
| Timer / Body Doubling / Music / Block App | Timer / Body Doubling / Musik / App blockieren | Minuteur / Body doubling / Musique / Bloquer une appli | Temporizador / Body doubling / Música / Bloquear app |
| Breathing Exercise / Meditation / Checklist | Atemübung / Meditation / Checkliste | Exercice de respiration / Méditation / Liste de contrôle | Ejercicio de respiración / Meditación / Lista de comprobación |
| Noted, I put that on your list. (server fallback) | Notiert, ich habe es auf deine Liste gesetzt. | C'est noté, je l'ai ajouté à ta liste. | Anotado, lo he puesto en tu lista. |
| AI generated · not drawn by Jack yet | KI-generiert · noch nicht von Jack gezeichnet | Généré par l'IA · pas encore dessiné par Jack | Generado por IA · aún no dibujado por Jack |

Notes:
- The answers of Concentr8 come in the language of the student (the model follows the message), so only the buttons and lines above need a dictionary.
- "Body doubling" has no common German, French or Spanish term; the English word is kept.
