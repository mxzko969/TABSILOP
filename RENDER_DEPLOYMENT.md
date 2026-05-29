# Render Deployment

This project is ready to deploy as a Render Web Service using the included `render.yaml` blueprint.

## Deploy with the blueprint

1. Push this project to a GitHub repository.
2. In Render, choose **New +** > **Blueprint**.
3. Connect the repository.
4. Render will detect `render.yaml` and create the `cacao-project` web service.
5. After deployment, open the generated Render URL.

## Manual Render settings

If you deploy manually instead of using the blueprint:

- **Service type:** Web Service
- **Runtime:** Node
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Environment variable:** `ADMIN_PASSWORD` set to a strong password
- **Optional environment variable:** `DJANGO_BASE_URL` if you deploy the Django admin/API separately

The app already uses Render's `PORT` environment variable in `server.js`.

Product images default to the bundled local files in `images/`, so the storefront works even when the Django admin is not deployed.

## Important note about data

This app writes orders, inventory, customers, rewards, sales, and production data to JSON files in the `data` folder. Render's normal web-service filesystem is temporary, so data written at runtime can be lost after redeploys or restarts.

For a production store, move this data to a hosted database or attach a Render disk and update `server.js` to write to the mounted disk path.
