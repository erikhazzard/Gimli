/* =========================================================================
 *
 * gulpfile.js
 *
 *  Gulp config / script setup
 *
 * ========================================================================= */
var gulp = require('gulp');
var browserify = require('browserify');
var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var concat = require('gulp-concat');
var imagemin = require('gulp-imagemin');
var sass = require('gulp-sass');
var gutil = require('gulp-util');
var minifycss = require('gulp-minify-css');

// Path config
var paths = {
  scripts: './static/js/**/*.js',
  css: ['./static/css/main.scss', './static/css/main.sass'],
  images: './static/img/**/*'
};

// Gulp Tasks
// --------------------------------------
gulp.task('scripts', function() {
    // use browserify and optimize scripts
    return browserify('./static/js/main.js')
        .bundle()
        .pipe(source('all.js'))
        .on('error', gutil.log)
        .on('error', gutil.beep)
        // TODO: uglify for non dev
        .pipe(gulp.dest('./static/build/js/'));
});

gulp.task('scripts-tests', function() {
    // Front end script tests
    return browserify('./static/js/tests/main.js')
        .bundle()
        .pipe(source('all-tests.js'))
        .on('error', gutil.log)
        .on('error', gutil.beep)
        // TODO: uglify for non dev
        .pipe(gulp.dest('./static/build/js/'));
});

gulp.task('images', function() {
    // Optimize images
    return gulp.src(paths.images)
        .pipe(imagemin({optimizationLevel: 5}))
        .pipe(gulp.dest('./static/build/img'));
});

gulp.task('sass', function () {
    // SASS Files
    gulp.src(paths.css)
        .pipe(sass())
        .pipe(minifycss())
        .pipe(gulp.dest('./static/build/css'));
});

// Watch
// --------------------------------------
gulp.task('watch', function() {
    // When files change, update
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.scripts, ['scripts-tests']);
    gulp.watch(paths.images, ['images']);
    gulp.watch(['./static/css/**/*.scss', './static/css/**/*.sass'], ['sass']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['scripts', 'scripts-tests', 'images', 'sass', 'watch']);
