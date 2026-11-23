let usuarioActivo = JSON.parse(localStorage.getItem('sgc_usuario_supabase')) || null;
let preguntasCargadas = [];

window.onload = () => {
    actualizarHeaderUI();
    if (usuarioActivo) {
        cargarDatosPerfil();
    }
};

function navTo(idVista) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    const vista = document.getElementById(idVista);
    if (vista) vista.classList.add('active');

    const drawer = document.getElementById('drawer');
    if (!drawer.classList.contains('-translate-x-full')) toggleDrawer();
    window.scrollTo(0, 0);
}

function toggleDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer.classList.contains('-translate-x-full')) {
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        drawer.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function actualizarHeaderUI() {
    const statusTxt = document.getElementById('drawer-user-status');
    const userBtn = document.getElementById('header-user-btn');
    const drawerBtn = document.getElementById('drawer-login-btn');
    const navPerfil = document.getElementById('nav-btn-perfil');
    const navExternos = document.getElementById('nav-portales-externos');

    if (usuarioActivo) {
        statusTxt.innerText = `Sesión activa: ${usuarioActivo.nombre}`;
        userBtn.innerHTML = `<i class="fa-solid fa-circle-user text-primary"></i>`;
        drawerBtn.innerHTML = `<i class="fa-solid fa-user"></i> Mi Perfil`;
        navPerfil.classList.remove('hidden');
        navExternos.classList.add('hidden'); // Oculta empresas/admin cuando el usuario ya inició sesión
    } else {
        statusTxt.innerText = 'Visitante (Sin iniciar sesión)';
        userBtn.innerHTML = `<i class="fa-solid fa-circle-user"></i>`;
        drawerBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión`;
        navPerfil.classList.add('hidden');
        navExternos.classList.remove('hidden');
    }
}

function verificarPerfil() {
    if (usuarioActivo) {
        cargarDatosPerfil();
        navTo('view-perfil');
    } else {
        navTo('view-login');
    }
}

function cerrarSesion() {
    usuarioActivo = null;
    localStorage.removeItem('sgc_usuario_supabase');
    actualizarHeaderUI();
    navTo('view-inicio');
}

// LOGIN / REGISTRO CANDIDATO
document.getElementById('form-login-candidato').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const nombre = document.getElementById('login-nombre').value.trim();
    const correo = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value.trim();

    btn.innerText = 'Conectando...';
    btn.disabled = true;

    try {
        const { data: existente } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('correo', correo)
            .maybeSingle();

        if (existente) {
            usuarioActivo = existente;
        } else {
            const { data: nuevo, error } = await supabaseClient
                .from('usuarios')
                .insert([{ nombre, correo, password }])
                .select()
                .single();

            if (error) throw error;
            usuarioActivo = nuevo;
        }

        localStorage.setItem('sgc_usuario_supabase', JSON.stringify(usuarioActivo));
        actualizarHeaderUI();
        cargarDatosPerfil();
        navTo('view-perfil');
    } catch (err) {
        alert('Error al conectar con la base de datos: ' + err.message);
    } finally {
        btn.innerText = 'Entrar / Registrarme';
        btn.disabled = false;
    }
});

// PERFIL CANDIDATO
function cargarDatosPerfil() {
    if (!usuarioActivo) return;
    document.getElementById('perfil-titulo-nombre').innerText = usuarioActivo.nombre;
    document.getElementById('edit-nombre').value = usuarioActivo.nombre || '';
    document.getElementById('edit-apellidos').value = usuarioActivo.apellidos || '';
    document.getElementById('edit-correo').value = usuarioActivo.correo || '';
    document.getElementById('edit-telefono').value = usuarioActivo.telefono || '';
    document.getElementById('edit-pais').value = usuarioActivo.pais || 'México';
    document.getElementById('edit-estado').value = usuarioActivo.estado || 'Guanajuato';
    cargarNotificacionesUsuario();
}

document.getElementById('form-actualizar-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!usuarioActivo) return;

    const btn = document.getElementById('btn-guardar-perfil');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

    const datosActualizados = {
        nombre: document.getElementById('edit-nombre').value.trim(),
        apellidos: document.getElementById('edit-apellidos').value.trim(),
        telefono: document.getElementById('edit-telefono').value.trim(),
        pais: document.getElementById('edit-pais').value.trim(),
        estado: document.getElementById('edit-estado').value.trim()
    };

    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .update(datosActualizados)
            .eq('correo', usuarioActivo.correo)
            .select()
            .single();

        if (error) throw error;

        usuarioActivo = data;
        localStorage.setItem('sgc_usuario_supabase', JSON.stringify(usuarioActivo));
        document.getElementById('perfil-titulo-nombre').innerText = usuarioActivo.nombre;
        alert('✅ Datos guardados correctamente.');
    } catch (err) {
        alert('Error al guardar cambios: ' + err.message);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios';
    }
});

// EXAMEN REAL
async function irAlExamen() {
    if (!usuarioActivo) {
        alert('Por favor inicia sesión primero para presentar tu evaluación.');
        navTo('view-login');
        return;
    }

    navTo('view-examen');
    document.getElementById('resultado-examen-box').classList.add('hidden');
    const contenedor = document.getElementById('contenedor-preguntas-examen');
    contenedor.innerHTML = '<p class="text-xs text-center text-gray-500">Cargando preguntas...</p>';

    try {
        const { data, error } = await supabaseClient
            .from('preguntas_examen')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        preguntasCargadas = data || [];

        contenedor.innerHTML = preguntasCargadas.map(p => `
            <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5 text-xs">
                <p class="font-bold text-secondary text-sm">${p.pregunta}</p>
                <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer">
                    <input type="radio" name="preg_${p.id}" value="A" required class="accent-primary"> A) ${p.opcion_a}
                </label>
                <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer">
                    <input type="radio" name="preg_${p.id}" value="B" required class="accent-primary"> B) ${p.opcion_b}
                </label>
                <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer">
                    <input type="radio" name="preg_${p.id}" value="C" required class="accent-primary"> C) ${p.opcion_c}
                </label>
            </div>
        `).join('');
    } catch (err) {
        contenedor.innerHTML = `<p class="text-xs text-danger text-center">Error: ${err.message}</p>`;
    }
}

document.getElementById('form-examen-real').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (preguntasCargadas.length === 0) return;

    let aciertos = 0;
    let listaFeedbackHTML = [];
    let resumenTexto = [];

    preguntasCargadas.forEach((p, index) => {
        const seleccionada = document.querySelector(`input[name="preg_${p.id}"]:checked`)?.value;
        if (seleccionada === p.correcta) {
            aciertos++;
            listaFeedbackHTML.push(`<p class="text-emerald-700">✅ <strong>Pregunta ${index + 1} Correcta:</strong> ${p.explicacion}</p>`);
        } else {
            listaFeedbackHTML.push(`<p class="text-red-600">❌ <strong>Pregunta ${index + 1} Incorrecta:</strong> ${p.explicacion}</p>`);
            resumenTexto.push(`P${index + 1}: ${p.explicacion}`);
        }
    });

    const puntajeFinal = Math.round((aciertos / preguntasCargadas.length) * 10);
    let puesto = 'Auxiliar Técnico Junior';
    if (puntajeFinal >= 8) puesto = 'Desarrollador / Analista Certificado';
    else if (puntajeFinal >= 6) puesto = 'Analista QA y Soporte';

    const feedbackFinal = resumenTexto.length === 0
        ? '¡Excelente desempeño! Dominaste todas las áreas evaluadas.'
        : `Obtuviste ${aciertos} de ${preguntasCargadas.length} aciertos. Retroalimentación: ${resumenTexto.join(' | ')}`;

    document.getElementById('res-puntaje').innerText = puntajeFinal;
    document.getElementById('res-puesto').innerText = puesto;
    document.getElementById('res-feedback-detalle').innerHTML = listaFeedbackHTML.join('');
    document.getElementById('resultado-examen-box').classList.remove('hidden');

    await supabaseClient.from('evaluaciones').insert([{
        usuario_correo: usuarioActivo.correo,
        usuario_nombre: usuarioActivo.nombre,
        puntaje: puntajeFinal,
        puesto_asignado: puesto,
        feedback_examen: feedbackFinal
    }]);
});

// NOTIFICACIONES
async function cargarNotificacionesUsuario() {
    const contenedor = document.getElementById('contenedor-notificaciones-perfil');
    if (!usuarioActivo || !contenedor) return;

    const { data: evals } = await supabaseClient
        .from('evaluaciones')
        .select('*')
        .eq('usuario_correo', usuarioActivo.correo)
        .order('id', { ascending: false });

    if (!evals || evals.length === 0) {
        contenedor.innerHTML = '<p class="text-gray-500 italic">Aún no has realizado tu examen técnico.</p>';
        return;
    }

    contenedor.innerHTML = evals.map(ev => {
        let colorBorde = 'border-yellow-400';
        let badge = '<span class="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold text-[10px]">En Revisión</span>';
        let botonContrato = '';

        if (ev.estatus_empresa === 'Aceptado') {
            colorBorde = 'border-primary';
            badge = '<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">CONTRATADO</span>';
            botonContrato = `<button onclick="verContrato('${ev.puesto_asignado}')" class="mt-2 bg-primary text-white font-bold py-1.5 px-4 rounded-lg text-xs">Leer Contrato Auditado</button>`;
        } else if (ev.estatus_empresa === 'Rechazado') {
            colorBorde = 'border-danger';
            badge = '<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold text-[10px]">NO SELECCIONADO</span>';
        }

        return `
            <div class="bg-white border-l-4 ${colorBorde} p-4 rounded-xl shadow-sm space-y-1.5">
                <div class="flex justify-between items-center">
                    <strong class="text-secondary text-sm">Puesto: ${ev.puesto_asignado} (${ev.puntaje}/10)</strong>
                    ${badge}
                </div>
                <p class="text-gray-600"><strong>Diagnóstico Examen:</strong> ${ev.feedback_examen}</p>
                ${ev.feedback_empresa ? `<p class="text-secondary bg-gray-100 p-2 rounded-lg"><strong>Motivo de la Empresa:</strong> ${ev.feedback_empresa}</p>` : ''}
                ${botonContrato}
            </div>
        `;
    }).join('');
}

function verContrato(puesto) {
    document.getElementById('modal-puesto-txt').innerText = puesto;
    document.getElementById('modal-contrato').classList.remove('hidden');
}

// === CONFIGURACIÓN PWA (INSTALACIÓN Y SERVICE WORKER) ===
let eventoInstalacionPWA = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker SGC-LABORAL registrado'))
            .catch((err) => console.error('Error al registrar SW:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacionPWA = e;
    const btnInstalar = document.getElementById('btn-instalar-pwa');
    if (btnInstalar) btnInstalar.classList.remove('hidden');
});

async function instalarPWA() {
    if (!eventoInstalacionPWA) {
        alert('Para instalar: abre el menú de tu navegador (⋮) y selecciona "Instalar aplicación" o "Agregar a pantalla de inicio".');
        return;
    }
    eventoInstalacionPWA.prompt();
    const { outcome } = await eventoInstalacionPWA.userChoice;
    if (outcome === 'accepted') {
        document.getElementById('btn-instalar-pwa')?.classList.add('hidden');
    }
    eventoInstalacionPWA = null;
}