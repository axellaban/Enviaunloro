// leaflet-rotate no publica tipos. Este archivo NO puede tener imports: una
// declaración ambiente de módulo solo vale en un archivo global, y en cuanto se
// agrega un import el archivo pasa a ser un módulo. Lo que agrega el plugin a
// L.Map vive en el archivo de al lado.
declare module "leaflet-rotate";
