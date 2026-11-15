import { Composition } from 'remotion';
import { Promo } from './Promo';
import { DURACION, FPS } from './escenas';

export const Root = () => (
  <Composition id="Promo" component={Promo} durationInFrames={DURACION} fps={FPS} width={1080} height={1920} />
);
