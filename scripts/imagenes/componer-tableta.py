"""
Coloca la portada REAL del libro en la pantalla de la tableta de la escena "02-tableta.png".

La imagen original traía una portada inventada (título dorado sobre un estadio) que no es la del libro.
Aquí se borra esa pantalla y se proyecta la portada real con la perspectiva de la tableta.

Uso:
    python3 scripts/imagenes/componer-tableta.py <02-tableta.png> <portada.webp> <salida.png>

Las esquinas de la pantalla (en píxeles de la imagen de 2000 × 1400) se midieron a mano.
"""
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

# Esquinas de la pantalla de la tableta: arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda.
PANTALLA = [(528, 258), (1135, 230), (1108, 1205), (436, 1150)]
# Cuánto se encoge la portada hacia el centro para dejar un marco oscuro dentro del cristal.
ENCOGER = 0.965
NEGRO_PANTALLA = (6, 7, 6)


def encoger(puntos, factor):
    cx = sum(p[0] for p in puntos) / 4
    cy = sum(p[1] for p in puntos) / 4
    return [(cx + (x - cx) * factor, cy + (y - cy) * factor) for x, y in puntos]


def coeficientes_perspectiva(destino, origen):
    """Coeficientes de PIL.Image.transform(PERSPECTIVE): mapean coordenadas de salida a coordenadas de entrada."""
    filas, valores = [], []
    for (x, y), (X, Y) in zip(destino, origen):
        filas.append([x, y, 1, 0, 0, 0, -x * X, -y * X])
        valores.append(X)
        filas.append([0, 0, 0, x, y, 1, -x * Y, -y * Y])
        valores.append(Y)
    return np.linalg.solve(np.array(filas, dtype=float), np.array(valores, dtype=float)).tolist()


def mascara(tam, puntos, suavizado=1.2):
    """Máscara del polígono con bordes suavizados (se dibuja al cuádruple de tamaño y se reduce)."""
    k = 4
    grande = Image.new("L", (tam[0] * k, tam[1] * k), 0)
    ImageDraw.Draw(grande).polygon([(x * k, y * k) for x, y in puntos], fill=255)
    return grande.resize(tam, Image.LANCZOS).filter(ImageFilter.GaussianBlur(suavizado))


def main(ruta_escena, ruta_portada, ruta_salida):
    escena = Image.open(ruta_escena).convert("RGB")
    portada = Image.open(ruta_portada).convert("RGB")
    w, h = portada.size

    # 1. Borra la portada inventada: rellena la pantalla (un poco ampliada) con el negro del cristal.
    borrar = mascara(escena.size, encoger(PANTALLA, 1.012), suavizado=1.0)
    escena.paste(Image.new("RGB", escena.size, NEGRO_PANTALLA), (0, 0), borrar)

    # 2. Proyecta la portada real dentro de la pantalla, con perspectiva.
    destino = encoger(PANTALLA, ENCOGER)
    origen = [(0, 0), (w, 0), (w, h), (0, h)]
    coef = coeficientes_perspectiva(destino, origen)
    proyectada = portada.transform(escena.size, Image.PERSPECTIVE, coef, resample=Image.BICUBIC)
    escena.paste(proyectada, (0, 0), mascara(escena.size, destino))

    # 3. Un reflejo muy tenue sobre el cristal (más claro arriba a la derecha) para que se integre.
    yy, xx = np.mgrid[0 : escena.size[1], 0 : escena.size[0]]
    intensidad = np.clip(26 * (1.55 - (xx - 528) / 620 - (yy - 230) / 980), 0, 26).astype(np.uint8)
    reflejo = ImageChops.multiply(Image.fromarray(intensidad), mascara(escena.size, destino))
    escena.paste(Image.new("RGB", escena.size, (255, 255, 255)), (0, 0), reflejo)

    escena.save(ruta_salida)
    print(f"Escena guardada en {ruta_salida}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
