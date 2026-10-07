// Pastikan satu instance jQuery tersedia sebagai global sebelum
// modul UMD Summernote dievaluasi (Vite mengevaluasi impor statis berurutan).
import $ from 'jquery';

window.$ = window.jQuery = $;

export default $;
