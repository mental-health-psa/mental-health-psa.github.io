/** psa.js
  *
  * Set up the canvas, then load and play the animation.
  *
  */

// A lot of this code is based on this website (written by younger me): https://user3456.insomnia247.nl/rgb/script.js
// Yes, the original code is quite ugly

// Wrap everything so global scope remains clean
(() => {
    'use strict';
    
    const args = new URL(document.location.href).searchParams;

    const debug = args.get('debug') || false;
    const cinematic = args.get('cinematic') || false;
    const starting_slide = args.get('start') || -1;
    const author_name = args.get('author') || 'Pipythonmc'; // Please do not change the author name and try to pass this off as your own. Just don't.
    const images = !args.get('noimages'); // Turns out the images don't actually look that bad

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const target_fps = 60;
    let last_tick = Date.now();
    let tick_duration = 1000 / target_fps;

    const scaledwidth = size => size * canvas.width / 1920;
    const scaledheight = size => size * canvas.height / 969;

    const fliptext = (text, progress, x, y, maxwidth) => {
        ctx.save();
        let height = ctx.measureText(text).fontBoundingBoxAscent
        ctx.translate(x, y - height + height * progress);
        ctx.scale(1, progress);

        ctx.fillText(text, 0, 0, maxwidth);

        ctx.restore();
    };

    const draw_svg_img = document.getElementById('draw-svg-image');
    const draw_svg_cache = {};
    const draw_svg = (name, x, y, width, height) => {
        if (!images) return;

        // https://jsfiddle.net/Wijmo5/h2L3gw88/
        const data = draw_svg_cache[name] || ('data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(document.getElementById(name))));
        draw_svg_cache[name] = data;
        draw_svg_img.src = data;
        if (width && !height) {
            // Caller means to scale image automatically to target width
            height = width / (draw_svg_img.naturalWidth / draw_svg_img.naturalHeight); // https://stackoverflow.com/a/12361685
        }
        ctx.drawImage(draw_svg_img, x, y, width, height);
    };
    const draw_image_cache = {};
    const draw_image = (name, x, y, width, height, opacity) => {
        if (!images) return;

        const orig_alpha = ctx.globalAlpha;
        ctx.globalAlpha = (!opacity && opacity != 0) ? 1 : opacity;

        // Draw a normal image
        const image = draw_image_cache[name] || document.getElementById(name);
        if (width && !height) {
            // Caller means to scale image automatically to target width
            height = width / (image.naturalWidth / image.naturalHeight); // https://stackoverflow.com/a/12361685
        }
        ctx.drawImage(image, x, y, width, height);

        ctx.globalAlpha = orig_alpha;
    }

    const state = {
        fps: {
            lastsecond: 0,
            fps: 0,
            tickingfps: 0,
        },
        current_slide: -1,
        animation_state: 0,
        animation_raw_progress: 0,
        animation_progress: 0,
        animation_paused: false, // true means we're waiting for a user keypress
        mini_progress: 0,
        pause_count: 0,
        current_animation: undefined,
        background_style: '#000',
        audio: null,
        audio_preload: new Audio('assets/soundtrack-5yRIt5yS36s.ogg'),
    };

    const strings = {
        defn: [
            'Anxiety Disorder', // Heading
            '/ang\ufeff\u00b7zai\ufeff\u00b7uh\ufeff\u00b7tee dis\ufeff\u00b7or\ufeff\u00b7dr/', // Subheading. \ufeff\u00b7 is the MIDDLE DOT character (U+00B7)
            'noun', // Italicized, lighter color
            'Frequent, intense, excessive, and persistent worry and fear about everyday situations.',
            'Often, anxiety disorders involve repeated panic attacks, which are sudden feelings of',
            'intense anxiety and fear or terror that reach a peak within minutes. These feelings of',
            'anxiety and panic interfere with daily activities, are difficult to control, are out of',
            'proportion to the actual danger, and can last a long time. Anxiety disorders include panic',
            'disorder, obsessive-compulsive disorder (OCD), phobias, or generalized anxiety disorder.',
        ],
        nextprompt: 'Press any key to continue',
        stats: [
            '19.1% of adults in the US are affected',
            '36.9% of those adults sought treatment',
            '18 million adults are struggling on their own',
            "They don't have to be alone",
        ],
        symptoms: [
            'Symptoms of Anxiety Disorder',
            '\u2022 Stress that is out of proportion to the impact of the event',
            '\u2022 Feelings of panic, doom, and danger',
            '\u2022 Cold, sweaty, numb, or tingling hands or feet',
        ],
        whattodo: [
            'What do you do if you have an anxiety disorder?',
            'Seek treatment!'
        ],
        treatment: [
            'Treatment Options',
            '\u2022 Stress management techniques, such as meditation or yoga',
            '\u2022 Cognitive behavioral therapy and psychotherapy',
            '\u2022 Medication (talk to a doctor before taking any!)'
        ],
        resources: [
            'Local Resources',
            '\u2022 Kaiser Permanente - kaiserpermanente.org',
            '\u2022 Stanford Children\'s Health - stanfordchildrens.org',
            '\u2022 Bayside Marin - baysidemarin.com'
        ],
        conclusion: [
            'Anxiety Disorders are common.',
            'You are not alone.',
            'Seek treatment.'
        ],
        credits: [
            'Credits',
            'Producer',
            'Animation',
            'Graphic Design',
            'Content',
            'Made with Javascript and HTML5 Canvas',
            'Viewable at https://mental-health-psa.github.io'
        ],
        thank: 'Thank you for watching!'
    };

    const draw_text = {
        defn: (opacity) => {
            ctx.save();
            ctx.translate(0, canvas.height * 0.15);

            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.textAlign = 'start';

            ctx.font = 'bold ' + scaledheight(72) + 'px serif';
            ctx.fillText(strings.defn[0], canvas.width * 0.3, canvas.height * 0.1);

            ctx.font = scaledheight(36) + 'px serif';
            ctx.fillText(strings.defn[1], canvas.width * 0.3, canvas.height * 0.15);

            ctx.font = 'italic ' + scaledheight(24) + 'px serif';
            ctx.fillText(strings.defn[2], canvas.width * 0.3, canvas.height * 0.2);

            ctx.font = scaledheight(24) + 'px serif';
            ctx.fillText(strings.defn[3], canvas.width * 0.3, canvas.height * 0.25, 810);
            ctx.fillText(strings.defn[4], canvas.width * 0.3, canvas.height * 0.3, 810);
            ctx.fillText(strings.defn[5], canvas.width * 0.3, canvas.height * 0.35, 810);
            ctx.fillText(strings.defn[6], canvas.width * 0.3, canvas.height * 0.4, 810);
            ctx.fillText(strings.defn[7], canvas.width * 0.3, canvas.height * 0.45, 810);
            ctx.fillText(strings.defn[8], canvas.width * 0.3, canvas.height * 0.5, 810);

            ctx.restore();
        },
        nextprompt: () => {
            if (cinematic) return;
            ctx.fillStyle = '#aaaaaa';
            ctx.textAlign = 'center';
            ctx.font = scaledheight(24) + 'px monospace';
            ctx.fillText(strings.nextprompt, canvas.width / 2, canvas.height * 0.975);
            ctx.textAlign = 'start';
        },
        stats1: (opacity) => {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.textAlign = 'center';
            ctx.font = scaledheight(36) + 'px serif';

            ctx.fillText(strings.stats[0], canvas.width * 0.3, canvas.height * 0.2);
            draw_image('191', canvas.width * 0.05, canvas.height * 0.3, canvas.width * 0.25, undefined, opacity);

            ctx.textAlign = 'start';
        },
        stats2: (opacity) => {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.textAlign = 'center';
            ctx.font = scaledheight(36) + 'px serif';

            ctx.fillText(strings.stats[1], canvas.width * 0.5, canvas.height * 0.4);
            draw_image('369', canvas.width * 0.5, canvas.height * -0.02, canvas.width * 0.25, undefined, opacity);

            ctx.textAlign = 'start';
        },
        stats3: (opacity) => {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.textAlign = 'center';
            ctx.font = scaledheight(36) + 'px serif';

            ctx.fillText(strings.stats[2], canvas.width * 0.7, canvas.height * 0.6);

            ctx.textAlign = 'start';
        },
        stats4: (opacity) => {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.textAlign = 'center';
            ctx.font = scaledheight(36) + 'px serif';

            ctx.fillText(strings.stats[3], canvas.width * 0.5, canvas.height * 0.8);

            ctx.textAlign = 'start';
        },
        symptomtitle: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold ' + scaledheight(48) + 'px serif';

            let width = ctx.measureText(strings.symptoms[0]).width;
            ctx.fillText(strings.symptoms[0], (canvas.width / 2 + width) * progress - width, canvas.height * 0.2);

            ctx.textAlign = 'start';
        },
        symptom1: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            ctx.save();
            let height = ctx.measureText(strings.symptoms[1]).fontBoundingBoxAscent
            ctx.translate(canvas.width * 0.3, canvas.height * 0.35 - height + height * progress);
            ctx.scale(1, progress);

            ctx.fillText(strings.symptoms[1], 0, 0);

            ctx.restore();
            ctx.save();

            ctx.translate(canvas.width * 0.275, canvas.height * 0.35 - height + height * progress + (-canvas.height * 0.2));
            ctx.scale(1, progress);

            draw_image('stress', -canvas.width * 0.25, 0, canvas.width * 0.25);

            ctx.restore();

            ctx.textAlign = 'start';
        },
        symptom2: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            ctx.save();
            let height = ctx.measureText(strings.symptoms[2]).fontBoundingBoxAscent
            ctx.translate(canvas.width * 0.3, canvas.height * 0.45 - height + height * progress);
            ctx.scale(1, progress);

            ctx.fillText(strings.symptoms[2], 0, 0);

            ctx.restore();

            ctx.textAlign = 'start';
        },
        symptom3: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            ctx.save();
            let height = ctx.measureText(strings.symptoms[3]).fontBoundingBoxAscent
            ctx.translate(canvas.width * 0.3, canvas.height * 0.55 - height + height * progress);
            ctx.scale(1, progress);

            ctx.fillText(strings.symptoms[3], 0, 0);
            draw_image('symptoms', -canvas.width * 0.3, 0, canvas.width * 0.25);

            ctx.restore();

            ctx.textAlign = 'start';
        },
        whattodo: (progress) => {
            // Gradient in

            progress *= 1.2;

            ctx.font = scaledheight(48) + 'px serif';
            ctx.textAlign = 'center';

            const width = ctx.measureText(strings.whattodo[0]).width;
            const gradient = ctx.createLinearGradient(canvas.width / 2 - width / 2, canvas.height * 0.3, canvas.width / 2 + width / 2, canvas.height * 0.3);
            for (let i = 0; i <= 120; i++) {
                if (Math.round(progress*100)/100 == (i+5)/100)
	                gradient.addColorStop(Math.min(i/100,1), '#fff')
                 else if (Math.round(progress*100)/100 == (i-5)/100)
                    gradient.addColorStop(Math.min(i/100,1), '#000')
                //gradient.addColorStop(i/100, progress >= i/100 ? '#fff' : '#000');
            }
            ctx.fillStyle = gradient;

            ctx.fillText(strings.whattodo[0], canvas.width / 2, canvas.height * 0.3);

            ctx.textAlign = 'start';
        },
        seektreatment: (progress) => {
            // Rainbow gradient in

            progress *= 1.2;

            ctx.font = scaledheight(96) + 'px serif';
            ctx.textAlign = 'center';

            const width = ctx.measureText(strings.whattodo[1]).width;
            const gradient = ctx.createLinearGradient(canvas.width / 2 - width / 2, canvas.height * 0.5, canvas.width / 2 + width / 2, canvas.height * 0.5);
            gradient.addColorStop(0, 'hsl(0, 100%, 50%)');
            gradient.addColorStop(1/10, 'hsl(30, 100%, 50%)');
            gradient.addColorStop(2/10, 'hsl(60, 100%, 50%)');
            gradient.addColorStop(3/10, 'hsl(90, 100%, 50%)');
            gradient.addColorStop(4/10, 'hsl(120, 100%, 50%)');
            gradient.addColorStop(5/10, 'hsl(150, 100%, 50%)');
            gradient.addColorStop(6/10, 'hsl(180, 100%, 50%)');
            gradient.addColorStop(7/10, 'hsl(210, 100%, 50%)');
            gradient.addColorStop(8/10, 'hsl(240, 100%, 50%)');
            gradient.addColorStop(9/10, 'hsl(270, 100%, 50%)');
            gradient.addColorStop(1, 'hsl(300, 100%, 50%)');
            ctx.fillStyle = gradient;

            ctx.fillText(strings.whattodo[1], canvas.width / 2, canvas.height * 0.5);

            ctx.fillStyle = '#000';

            draw_image('treatment', canvas.width * 0.375, canvas.height * 0.5, canvas.width * 0.25);
            
            ctx.fillRect(canvas.width / 2 + width / 2, canvas.height / 2 - scaledheight(96), -width * (1-progress), canvas.height);

            ctx.textAlign = 'start';
        },
        treatmenttitle: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(48) + 'px serif';
            ctx.textAlign = 'center'

            fliptext(strings.treatment[0], progress, canvas.width * 0.25, canvas.height * 0.2)

            ctx.textAlign = 'start';
        },
        treatment1: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            fliptext(strings.treatment[1], progress, canvas.width * 0.05, canvas.height * 0.3);
            draw_image('yoga', canvas.width * 0.1, canvas.height * 0.5, canvas.width * 0.25, undefined, progress);
        },
        treatment2: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            fliptext(strings.treatment[2], progress, canvas.width * 0.05, canvas.height * 0.35);
            draw_image('therapy', canvas.width * 0.375, canvas.height * 0.5, canvas.width * 0.25, undefined, progress);
        },
        treatment3: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            fliptext(strings.treatment[3], progress, canvas.width * 0.05, canvas.height * 0.4);
            draw_image('medicine', canvas.width * 0.65, canvas.height * 0.5, canvas.width * 0.25, undefined, progress);
        },
        treatmentall: (progress) => {
            draw_text.treatmenttitle(progress);
            draw_text.treatment1(progress);
            draw_text.treatment2(progress);
            draw_text.treatment3(progress);
        },
        resourcestitle: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(48) + 'px serif';
            ctx.textAlign = 'center'

            fliptext(strings.resources[0], progress, canvas.width * 0.75, canvas.height * 0.2)

            ctx.textAlign = 'start';
        },
        resources1: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            fliptext(strings.resources[1], progress, canvas.width * 0.55, canvas.height * 0.3);
        },
        resources2: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            fliptext(strings.resources[2], progress, canvas.width * 0.55, canvas.height * 0.35);
        },
        resources3: (progress) => {
            ctx.fillStyle = '#fff';
            ctx.font = scaledheight(36) + 'px serif';

            fliptext(strings.resources[3], progress, canvas.width * 0.55, canvas.height * 0.4);
        },
        resourcesall: (progress) => {
            draw_text.resourcestitle(progress);
            draw_text.resources1(progress);
            draw_text.resources2(progress);
            draw_text.resources3(progress);
        },
        treatmentresources: (progress) => { // Optimized version. basically treatmentall + resourcesall but with different effects
            ctx.save();
            ctx.scale(progress, progress);

            ctx.fillStyle = 'rgba(255, 255, 255, ' + progress + ')';

            ctx.font = scaledheight(48) + 'px serif';
            ctx.textAlign = 'center'

            ctx.fillText(strings.treatment[0], canvas.width * 0.25, canvas.height * 0.2);
            ctx.fillText(strings.resources[0], canvas.width * 0.75, canvas.height * 0.2);

            ctx.textAlign = 'start';
            ctx.font = scaledheight(36) + 'px serif';

            ctx.fillText(strings.treatment[1], canvas.width * 0.05, canvas.height * 0.3);
            ctx.fillText(strings.treatment[2], canvas.width * 0.05, canvas.height * 0.35);
            ctx.fillText(strings.treatment[3], canvas.width * 0.05, canvas.height * 0.4);
            
            ctx.fillText(strings.resources[1], canvas.width * 0.55, canvas.height * 0.3);
            ctx.fillText(strings.resources[2], canvas.width * 0.55, canvas.height * 0.35);
            ctx.fillText(strings.resources[3], canvas.width * 0.55, canvas.height * 0.4);

            draw_image('yoga', canvas.width * 0.1, canvas.height * 0.5, canvas.width * 0.25, undefined, progress);
            draw_image('therapy', canvas.width * 0.375, canvas.height * 0.5, canvas.width * 0.25, undefined, progress);
            draw_image('medicine', canvas.width * 0.65, canvas.height * 0.5, canvas.width * 0.25, undefined, progress);

            ctx.restore();
        },
        conclusion1: (opacity) => {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.font = scaledheight(36) + 'px serif';
            ctx.textAlign = 'center';

            ctx.fillText(strings.conclusion[0], canvas.width * 0.5, canvas.height * 0.35);

            ctx.textAlign = 'start';
        },
        conclusion2: (opacity) => {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.font = scaledheight(36) + 'px serif';
            ctx.textAlign = 'center';

            ctx.fillText(strings.conclusion[1], canvas.width * 0.5, canvas.height * 0.45);

            ctx.textAlign = 'start';
        },
        conclusion3: (opacity) => {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.font = scaledheight(36) + 'px serif';
            ctx.textAlign = 'center';

            ctx.fillText(strings.conclusion[2], canvas.width * 0.5, canvas.height * 0.55);

            ctx.textAlign = 'start';
        },
        credits: (progress) => {
            ctx.save();
            ctx.translate(0, -progress * canvas.height * 2 + canvas.height);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + scaledheight(48) + 'px serif';
            ctx.textAlign = 'center';

            ctx.fillText(strings.credits[0], canvas.width / 2, canvas.height * 0.3);

            ctx.font = scaledheight(36) + 'px serif';
            ctx.textAlign = 'left';

            ctx.fillText(strings.credits[1], canvas.width * 0.33, canvas.height * 0.4);
            ctx.fillText(strings.credits[2], canvas.width * 0.33, canvas.height * 0.475);
            ctx.fillText(strings.credits[3], canvas.width * 0.33, canvas.height * 0.55);
            ctx.fillText(strings.credits[4], canvas.width * 0.33, canvas.height * 0.625);
            
            ctx.textAlign = 'right';
            ctx.fillText(author_name, canvas.width * 0.66, canvas.height * 0.4);
            ctx.fillText(author_name, canvas.width * 0.66, canvas.height * 0.475);
            ctx.fillText(author_name, canvas.width * 0.66, canvas.height * 0.55);
            ctx.fillText(author_name, canvas.width * 0.66, canvas.height * 0.625);

            ctx.textAlign = 'center';
            ctx.fillText(strings.credits[5], canvas.width / 2, canvas.height * 0.75);
            ctx.fillText(strings.credits[6], canvas.width / 2, canvas.height * 0.8);

            ctx.restore();
        },
        thank: (opacity) => {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.font = scaledheight(72) + 'px serif';
            ctx.textAlign = 'center';

            ctx.fillText(strings.thank, canvas.width * 0.5, canvas.height * 0.5);

            ctx.textAlign = 'start';
        }
    };

    const animations = [
        { // Give extra time if in cinematic mode
            duration: cinematic ? 5000 : 0,
            draw: (progress) => {
                // progress = value between 0 and 1 where 1 == complete
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.font = scaledheight(48) + 'px monospace';

                ctx.fillText(progress > 0.8 ? '1' : progress > 0.6 ? '2' : progress > 0.4 ? '3' : progress > 0.2 ? '4' : '5', canvas.width / 2, canvas.height / 2)
            }
        },
        { // Extra pause
            duration: cinematic ? 3000 : 0,
            draw:()=>{}
        },
        { // Fade in definition of anxiety disorder
            duration: 2500, // milliseconds
            draw: (progress) => {
                // Start music
                // Source: youtube-5yRIt5yS36s
                if (!state.audio) {
                    state.audio = true
                    state.audio_preload.play();
                }
                draw_text.defn(progress);
            },
        },
        { // Show definition of anxiety disorder
            duration: cinematic ? 30000 : 1, // 30s if cinematic, otherwise until keypress
            start_paused: true,
            draw: () => {
                draw_text.defn(1);
                draw_text.nextprompt();
            }
        },
        { // Fade out definition
            duration: 2000, // ms
            draw: (progress) => {
                draw_text.defn(1 - progress); // Invert, since its fade out
            }
        },
        { // Wait a bit
            duration: 1000, // ms
            draw: ()=>{}
        },
        { // Fade in stats #1
            duration: 2000, // ms
            draw: (progress) => {
                draw_text.stats1(progress);
            }
        },
        { // Fade in stats #2
            duration: 2000, // ms
            draw: (progress) => {
                draw_text.stats1(1);
                draw_text.stats2(progress);
            }
        },
        { // Fade in stats #3
            duration: 2000, // ms
            draw: (progress) => {
                draw_text.stats1(1);
                draw_text.stats2(1);
                draw_text.stats3(progress);
            }
        },
        { // Keep stats on screen
            duration: cinematic ? 3000 : 1, // ms
            start_paused: true,
            draw: () => {
                draw_text.stats1(1);
                draw_text.stats2(1);
                draw_text.stats3(1);
                draw_text.nextprompt();
            }
        },
        { // Fade out some stats
            duration: 3000, // ms
            draw: (progress) => {
                draw_text.stats1(1-progress); // invert
                draw_text.stats2(1-progress);
                draw_text.stats3(1);
            }
        },
        { // Fade in last line
            duration: 3000, // ms
            draw: (progress) => {
                draw_text.stats3(1);
                draw_text.stats4(progress);
            }
        },
        { // Pause
            duration: cinematic ? 3500 : 1, // ms
            start_paused: true,
            draw: (progress) => {
                draw_text.stats3(1);
                draw_text.stats4(1);
                draw_text.nextprompt();
            }
        },
        { // Fade out everything
            duration: 5000,
            draw: (progress) => {
                draw_text.stats3(1-progress);
                draw_text.stats4(1-progress);
            }
        },
        { // Slight delay
            duration: 2000,
            draw: ()=>{}
        },
        { // Show symptoms
            duration: 1000,
            draw: (progress) => {
                draw_text.symptomtitle(progress);
            }
        },
        { // Slight cooldown
            duration: 1000,
            draw: ()=>{
                draw_text.symptomtitle(1);
            }
        },
        {
            duration: 500,
            draw: (progress) => {
                draw_text.symptomtitle(1);
                draw_text.symptom1(progress);
            }
        },
        { // Another cooldown
            duration: 1000,
            draw: ()=>{
                draw_text.symptomtitle(1);
                draw_text.symptom1(1);
            }
        },
        {
            duration: 500,
            draw: (progress) => {
                draw_text.symptomtitle(1);
                draw_text.symptom1(1);
                draw_text.symptom2(progress);
            }
        },
        {
            duration: 1000,
            draw: ()=>{
                draw_text.symptomtitle(1);
                draw_text.symptom1(1);
                draw_text.symptom2(1);
            }
        },
        {
            duration: 500,
            draw: (progress) => {
                draw_text.symptomtitle(1);
                draw_text.symptom1(1);
                draw_text.symptom2(1);
                draw_text.symptom3(progress);
            }
        },
        { // Give audience time to read
            duration: cinematic ? 12000 : 1,
            start_paused: true,
            draw: (progress) => {
                draw_text.symptomtitle(1);
                draw_text.symptom1(1);
                draw_text.symptom2(1);
                draw_text.symptom3(1);
                draw_text.nextprompt();
            }
        },
        { // Flop out
            duration: 500,
            draw: (progress) => {
                draw_text.symptomtitle(1+progress); // continue out
                draw_text.symptom1(Math.max(0, 1-progress*2));
                draw_text.symptom2(Math.max(0, 1-progress*2));
                draw_text.symptom3(Math.max(0, 1-progress*2));
            }
        },
        { // Wait 1s
            duration: 500,
            draw: ()=>{}
        },
        { // What do you do if you have disorder
            duration: 2000,
            draw: (progress) => {
                draw_text.whattodo(progress);
            }
        },
        { // Give time to read
            duration: 500,
            draw: () => {draw_text.whattodo(1);}
        },
        { // Get treatment
            duration: 1000,
            draw: (progress) => {
                draw_text.whattodo(1);
                draw_text.seektreatment(progress);
            }
        },
        { // Give more time to read
            duration: cinematic ? 5000 : 1,
            start_paused: true,
            draw: () => {
                draw_text.whattodo(1);
                draw_text.seektreatment(1);
                draw_text.nextprompt();
            }
        },
        { // Draw cover sliding down
            duration: 1000,
            draw: (progress) => {
                draw_text.whattodo(1);
                draw_text.seektreatment(1);

                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height * progress);
            }
        },
        { // Keep sliding down
            duration: 1000,
            draw: (progress) => {
                ctx.fillStyle = '#111';
                ctx.fillRect(0, canvas.height * progress, canvas.width, canvas.height * (1-progress));
            }
        },
        { // Treatment options
            duration: 500,
            draw: (progress) => {
                draw_text.treatmenttitle(progress);
            }
        },
        { // Option 1
            duration: 500,
            draw: (progress) => {
                draw_text.treatmenttitle(1);
                draw_text.treatment1(progress);
            }
        },
        { // Option 2
            duration: 500,
            draw: (progress) => {
                draw_text.treatmenttitle(1);
                draw_text.treatment1(1);
                draw_text.treatment2(progress);
            }
        },
        { // Option 3
            duration: 500,
            draw: (progress) => {
                draw_text.treatmenttitle(1);
                draw_text.treatment1(1);
                draw_text.treatment2(1);
                draw_text.treatment3(progress);
            }
        },
        { // Local resources
            duration: 500,
            draw: (progress) => {
                draw_text.treatmentall(1);
                draw_text.resourcestitle(progress);
            }
        },
        { // Resource 1
            duration: 500,
            draw: (progress) => {
                draw_text.treatmentall(1);
                draw_text.resourcestitle(1);
                draw_text.resources1(progress);
            }
        },
        { // Resource 2
            duration: 500,
            draw: (progress) => {
                draw_text.treatmentall(1);
                draw_text.resourcestitle(1);
                draw_text.resources1(1);
                draw_text.resources2(progress);
            }
        },
        { // Resource 3
            duration: 500,
            draw: (progress) => {
                draw_text.treatmentall(1);
                draw_text.resourcestitle(1);
                draw_text.resources1(1);
                draw_text.resources2(1);
                draw_text.resources3(progress);
            }
        },
        { // Give time to read
            duration: cinematic ? 25000 : 1, // 25s if cinematic
            start_paused: true,
            draw: () => {
                draw_text.treatmentresources(1);
                draw_text.nextprompt();
            }
        },
        { // Slide out
            duration: 1000,
            draw: (progress) => {
                draw_text.treatmentresources(1-progress);
            }
        },
        { // Wait a little bit
            duration: 1500,
            draw: () => {}
        },
        { // Conclusion begin
            duration: 2500,
            draw: (progress) => {
                draw_text.conclusion1(progress);
            }
        },
        {
            duration: 2500,
            draw: (progress) => {
                draw_text.conclusion1(1);
                draw_text.conclusion2(progress);
            }
        },
        {
            duration: 2500,
            draw: (progress) => {
                draw_text.conclusion1(1);
                draw_text.conclusion2(1);
                draw_text.conclusion3(progress);
            }
        },
        { // Stay on screen for effect
            duration: 5000,
            draw: () => {
                draw_text.conclusion1(1);
                draw_text.conclusion2(1);
                draw_text.conclusion3(1);
            }
        },
        { // Slowly fade out
            duration: 3000,
            draw: (progress) => {
                draw_text.conclusion1(1-progress);
                draw_text.conclusion2(1-progress);
                draw_text.conclusion3(1-progress);
            }
        },
        { // Wait 5 seconds
            duration: 5000,
            draw: () => {}
        },
        { // Credits
            duration: 10000,
            draw: (progress) => {
                draw_text.credits(progress);
            }
        },
        { // Fade in thanks
            duration: 3000,
            draw: (progress) => {
                draw_text.thank(progress);
            }
        },
        { // Keep thanks on screen
            duration: Infinity,
            draw: () => {
                draw_text.thank(1);
                // Dirty hack but it improves performance
                requestAnimationFrame=()=>{};
            }
        },
        /* // RIP amogus ending screen. 2022-2022
        { // Ending
            duration: Infinity, // Does not end
            update: () => {
                state.background_style = '#000000';
            },
            draw: () => {
                ctx.fillStyle = '#ffffff';
                ctx.font = scaledwidth(48) + 'px serif';
                ctx.fillText('END', 50, 50);
                draw_svg('test', canvas.width / 2, 15, canvas.width / 5);
            },
        },*/
    ];

    const updateSize = () => {
        canvas.width = document.documentElement.clientWidth;
        canvas.height = document.documentElement.clientHeight;
    };

    const draw = () => {
        // Redraw background
        ctx.fillStyle = state.background_style;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw current animation
        state.current_animation.draw(state.animation_progress)

        ctx.resetTransform(); // In case the animation decides to change transform settings (scale, rotation, etc.)

        if (debug) {
            // Draw FPS counter
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.font = scaledheight(48) + 'px monospace';
            ctx.textAlign = 'start';
            ctx.fillText('FPS: ' + state.fps.fps, scaledwidth(25), canvas.height - scaledheight(25));

            ctx.font = scaledheight(24) + 'px monospace';
            ctx.fillText(state.animation_raw_progress + '/' + state.current_animation.duration, scaledwidth(25), canvas.height - scaledheight(72));
            ctx.fillText(state.current_slide, scaledwidth(25), canvas.height - scaledheight(96));
        }
    };

    const update = () => {
        // Calculate delta time
        let now = Date.now();
        let deltatime = now - last_tick;
        last_tick = now;
        state.dt = deltatime;

        // Update animation progress
        if (state.animation_progress >= 1 || !state.current_animation || (state.current_slide == -1 && starting_slide != -1)) {
            if (state.current_slide == -1 && starting_slide != -1) {
                state.current_slide = starting_slide - 1;
            }
            state.current_slide += 1;
            state.current_animation = animations[state.current_slide];
            state.animation_raw_progress = 0;
            state.pause_count = 0;
            state.animation_paused = state.current_animation.start_paused;
        }

        if (cinematic || !state.animation_paused)
            state.animation_raw_progress += deltatime;
        state.animation_progress = Math.min(state.animation_raw_progress / state.current_animation.duration, 1);

        if (state.current_animation.update)
            state.current_animation.update(state.animation_progress);

        if (debug) {
            state.fps.tickingfps += 1;
            if (state.fps.lastsecond != Math.floor(Date.now() / 1000)) {
                state.fps.lastsecond = Math.floor(Date.now()/1000);
                state.fps.fps = state.fps.tickingfps;
                state.fps.tickingfps = 0;
            }
        }

        draw();
        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);

    window.addEventListener('resize', (e) => {
        updateSize();
        updateSize(); // Update size twice, in case scrollbars appear for any reason
        // Then redraw
        draw();
    });

    if (!cinematic)
        window.addEventListener('keydown', (event) => {
            state.animation_paused = false;
        });

    updateSize(); // Fit canvas to screen
})();
