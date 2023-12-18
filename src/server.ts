import app from './app.js';
import { server as serverConfig } from './config/littleterrarium.config.js';

const port = process.env.PORT || serverConfig.port;

app.listen(port, () => {
  console.log(`Little Terrarium server started on ${port}`);
});
