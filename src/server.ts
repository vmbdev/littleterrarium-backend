import app from './app';
import { server as serverConfig } from '../littleterrarium.config';

const port = process.env.PORT || serverConfig.port;

app.listen(port, () => {
  console.log(`Little Terrarium server started on ${port}`);
});