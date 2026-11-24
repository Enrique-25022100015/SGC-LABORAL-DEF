let usuarioActivo = JSON.parse(localStorage.getItem('sgc_usuario_supabase')) || null;
let preguntasCargadas = [];
let tiempoInicioExamen = null;
let evaluacionContratoActual = null;
let listaEvaluacionesUsuario = [];
let siguienteNivelDesbloqueado = 2;
let temporizadorEspera = null;

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
    if (drawer && !drawer.classList.contains('-translate-x-full')) toggleDrawer();
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
        navExternos.classList.add('hidden');
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
        cambiarTabAuth('login');
        navTo('view-login');
    }
}

function cerrarSesion() {
    usuarioActivo = null;
    localStorage.removeItem('sgc_usuario_supabase');
    actualizarHeaderUI();
    navTo('view-inicio');
}

// === LOGIN Y REGISTRO SEPARADOS ===
function cambiarTabAuth(modo) {
    const formLogin = document.getElementById('form-iniciar-sesion');
    const formReg = document.getElementById('form-crear-cuenta');
    const tabLogin = document.getElementById('tab-btn-login');
    const tabReg = document.getElementById('tab-btn-registro');

    if (modo === 'login') {
        formLogin.classList.remove('hidden');
        formLogin.classList.add('flex');
        formReg.classList.add('hidden');
        formReg.classList.remove('flex');
        tabLogin.className = 'py-2.5 rounded-xl text-xs font-black bg-secondary text-white transition';
        tabReg.className = 'py-2.5 rounded-xl text-xs font-black text-gray-600 hover:text-secondary transition';
    } else {
        formReg.classList.remove('hidden');
        formReg.classList.add('flex');
        formLogin.classList.add('hidden');
        formLogin.classList.remove('flex');
        tabReg.className = 'py-2.5 rounded-xl text-xs font-black bg-primary text-white transition';
        tabLogin.className = 'py-2.5 rounded-xl text-xs font-black text-gray-600 hover:text-secondary transition';
    }
}

document.getElementById('form-iniciar-sesion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-login');
    const correo = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value.trim();

    btn.innerText = 'Verificando credenciales...';
    btn.disabled = true;

    try {
        const { data: usuario, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('correo', correo)
            .maybeSingle();

        if (error) throw error;
        if (!usuario) {
            alert('❌ No existe una cuenta con ese correo. Selecciona "Crear Cuenta".');
            return;
        }
        if (usuario.password !== password) {
            alert('❌ Contraseña incorrecta.');
            return;
        }

        usuarioActivo = usuario;
        localStorage.setItem('sgc_usuario_supabase', JSON.stringify(usuarioActivo));
        actualizarHeaderUI();
        cargarDatosPerfil();
        navTo('view-perfil');
    } catch (err) {
        alert('Error de conexión: ' + err.message);
    } finally {
        btn.innerText = 'Entrar a Mi Perfil';
        btn.disabled = false;
    }
});

document.getElementById('form-crear-cuenta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-registro');
    const nombre = document.getElementById('reg-nombre').value.trim();
    const correo = document.getElementById('reg-correo').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    btn.innerText = 'Creando cuenta...';
    btn.disabled = true;

    try {
        const { data: yaExiste } = await supabaseClient
            .from('usuarios')
            .select('id')
            .eq('correo', correo)
            .maybeSingle();

        if (yaExiste) {
            alert('⚠️ Este correo ya está registrado. Inicia sesión.');
            cambiarTabAuth('login');
            return;
        }

        const { data: nuevo, error } = await supabaseClient
            .from('usuarios')
            .insert([{ nombre, correo, password, visible_empresas: false }])
            .select()
            .single();

        if (error) throw error;

        usuarioActivo = nuevo;
        localStorage.setItem('sgc_usuario_supabase', JSON.stringify(usuarioActivo));
        actualizarHeaderUI();
        cargarDatosPerfil();
        alert('✅ Cuenta creada exitosamente.');
        navTo('view-perfil');
    } catch (err) {
        alert('Error al crear cuenta: ' + err.message);
    } finally {
        btn.innerText = 'Crear Cuenta Nueva';
        btn.disabled = false;
    }
});

// === PERFIL AMPLIADO Y PRIVACIDAD ===
function cargarDatosPerfil() {
    if (!usuarioActivo) return;
    document.getElementById('perfil-titulo-nombre').innerText = usuarioActivo.nombre;
    document.getElementById('edit-nombre').value = usuarioActivo.nombre || '';
    document.getElementById('edit-apellidos').value = usuarioActivo.apellidos || '';
    document.getElementById('edit-correo').value = usuarioActivo.correo || '';
    document.getElementById('edit-telefono').value = usuarioActivo.telefono || '';
    document.getElementById('edit-pais').value = usuarioActivo.pais || 'México';
    document.getElementById('edit-estado').value = usuarioActivo.estado || 'Guanajuato';
    document.getElementById('edit-escolaridad').value = usuarioActivo.escolaridad || '';
    document.getElementById('edit-portafolio').value = usuarioActivo.portafolio_url || '';
    document.getElementById('edit-habilidades').value = usuarioActivo.habilidades || '';
    document.getElementById('edit-experiencia').value = usuarioActivo.experiencia || '';
    document.getElementById('edit-visible-empresas').checked = Boolean(usuarioActivo.visible_empresas);
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
        estado: document.getElementById('edit-estado').value.trim(),
        escolaridad: document.getElementById('edit-escolaridad').value.trim(),
        portafolio_url: document.getElementById('edit-portafolio').value.trim(),
        habilidades: document.getElementById('edit-habilidades').value.trim(),
        experiencia: document.getElementById('edit-experiencia').value.trim(),
        visible_empresas: document.getElementById('edit-visible-empresas').checked
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
        alert('✅ Perfil y preferencias de privacidad guardados.');
    } catch (err) {
        alert('Error al guardar cambios: ' + err.message);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Perfil y Privacidad';
    }
});

// === EVALUACIÓN PROGRESIVA (NIVELES 1 AL 10) ===
async function irAlExamen() {
    if (!usuarioActivo) {
        alert('Por favor inicia sesión primero para presentar tu evaluación.');
        navTo('view-login');
        return;
    }

    const aceptoHonestidad = document.getElementById('check-honestidad-examen')?.checked;
    if (!aceptoHonestidad) {
        alert('⚠️ Debes marcar la casilla de declaración de honestidad académica antes de iniciar.');
        return;
    }

    navTo('view-examen');
    await cargarPreguntasNivel();
}

function avanzarSiguienteNivel() {
    if (temporizadorEspera) {
        clearInterval(temporizadorEspera);
        temporizadorEspera = null;
    }
    const selectNivel = document.getElementById('select-nivel-examen');
    selectNivel.value = String(siguienteNivelDesbloqueado);
    cargarPreguntasNivel();
    window.scrollTo(0, 0);
}

async function cargarPreguntasNivel() {
    if (temporizadorEspera) {
        clearInterval(temporizadorEspera);
        temporizadorEspera = null;
    }

    const area = document.getElementById('select-area-examen').value;
    const selectNivel = document.getElementById('select-nivel-examen');
    const contenedor = document.getElementById('contenedor-preguntas-examen');
    const btnEnviar = document.getElementById('btn-enviar-examen');

    // 1. Consultar nivel máximo desbloqueado en esta área
    const { data: historialArea } = await supabaseClient
        .from('evaluaciones')
        .select('nivel, puntaje')
        .eq('usuario_correo', usuarioActivo.correo)
        .eq('area', area);

    const registros = historialArea || [];
    let maxNivelDesbloqueado = 1;

    registros.forEach(r => {
        if (Number(r.puntaje) >= 8 && Number(r.nivel) >= maxNivelDesbloqueado) {
            maxNivelDesbloqueado = Math.min(Number(r.nivel) + 1, 10);
        }
    });

    Array.from(selectNivel.options).forEach(opt => {
        const numOpt = parseInt(opt.value, 10);
        if (numOpt > maxNivelDesbloqueado) {
            opt.disabled = true;
            opt.text = `Nivel ${numOpt} (Bloqueado - Requiere Nivel ${numOpt - 1})`;
        } else {
            opt.disabled = false;
            opt.text = numOpt === 1 ? 'Nivel 1 (Inicial)' : `Nivel ${numOpt} (Desbloqueado)`;
        }
    });

    if (parseInt(selectNivel.value, 10) > maxNivelDesbloqueado) {
        selectNivel.value = String(maxNivelDesbloqueado);
    }

    const nivel = parseInt(selectNivel.value, 10);

    document.getElementById('resultado-examen-box').classList.add('hidden');
    contenedor.innerHTML = '<p class="text-xs text-center text-gray-500 py-4">Verificando disponibilidad del Nivel ' + nivel + '...</p>';

    // 2. Consultar intentos y tiempo de espera exacto al servidor PostgreSQL
    const { data: estado, error: errEstado } = await supabaseClient.rpc('estado_intentos_nivel', {
        p_correo: usuarioActivo.correo,
        p_area: area,
        p_nivel: nivel
    });

    if (errEstado) {
        contenedor.innerHTML = `<p class="text-xs text-danger text-center">Error al verificar intentos: ${errEstado.message}</p>`;
        return;
    }

    const numIntentos = estado.intentos;
    let esperaRestante = estado.espera_restante;

    if (numIntentos >= 3) {
        document.getElementById('badge-intento-actual').innerText = 'Límite 3/3 alcanzado';
        contenedor.innerHTML = `<div class="bg-red-50 border border-red-300 text-red-800 p-4 rounded-2xl text-xs text-center">
            <strong>⛔ Has agotado tus 3 intentos en ${area} (Nivel ${nivel}).</strong>
        </div>`;
        btnEnviar.classList.add('hidden');
        return;
    }

    // 3. Si hay espera activa, mostrar contador regresivo automático
    if (esperaRestante > 0) {
        btnEnviar.classList.add('hidden');
        const actualizarContador = () => {
            if (esperaRestante <= 0) {
                clearInterval(temporizadorEspera);
                temporizadorEspera = null;
                cargarPreguntasNivel();
                return;
            }
            document.getElementById('badge-intento-actual').innerText = `Espera: ${esperaRestante}s`;
            contenedor.innerHTML = `<div class="bg-amber-50 border border-amber-300 text-amber-900 p-5 rounded-2xl text-xs text-center space-y-2">
                <p class="font-bold text-sm">⏳ Tiempo de espera entre intentos</p>
                <p>Podrás realizar tu <strong>Intento ${numIntentos + 1} de 3</strong> en el Nivel ${nivel} en <strong>${esperaRestante}</strong> segundos.</p>
            </div>`;
            esperaRestante--;
        };
        actualizarContador();
        temporizadorEspera = setInterval(actualizarContador, 1000);
        return;
    }

    // 4. Cargar las preguntas del nivel
    btnEnviar.classList.remove('hidden');
    document.getElementById('badge-intento-actual').innerText = `Nivel ${nivel} • Intento ${numIntentos + 1}/3`;

    try {
        const { data, error } = await supabaseClient.rpc('obtener_preguntas_por_nivel', {
            p_area: area,
            p_nivel: nivel
        });
        if (error) throw error;

        preguntasCargadas = data || [];
        tiempoInicioExamen = Date.now();

        if (preguntasCargadas.length === 0) {
            contenedor.innerHTML = '<p class="text-xs text-center text-gray-500">No hay preguntas disponibles para este nivel aún.</p>';
            btnEnviar.classList.add('hidden');
            return;
        }

        contenedor.innerHTML = preguntasCargadas.map((p, idx) => `
            <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5 text-xs">
                <div class="flex justify-between items-center text-[10px] font-bold uppercase text-primary">
                    <span>${p.categoria}</span>
                    <span>Nivel ${p.nivel}</span>
                </div>
                <p class="font-bold text-secondary text-sm">${idx + 1}. ${p.pregunta}</p>
                <label class="flex items-center gap-2 p-2.5 rounded-lg hover:bg-white cursor-pointer">
                    <input type="radio" name="preg_${p.id}" value="A" required class="accent-primary"> A) ${p.opcion_a}
                </label>
                <label class="flex items-center gap-2 p-2.5 rounded-lg hover:bg-white cursor-pointer">
                    <input type="radio" name="preg_${p.id}" value="B" required class="accent-primary"> B) ${p.opcion_b}
                </label>
                <label class="flex items-center gap-2 p-2.5 rounded-lg hover:bg-white cursor-pointer">
                    <input type="radio" name="preg_${p.id}" value="C" required class="accent-primary"> C) ${p.opcion_c}
                </label>
            </div>
        `).join('');
    } catch (err) {
        contenedor.innerHTML = `<p class="text-xs text-danger text-center">Error al cargar examen: ${err.message}</p>`;
    }
}

document.getElementById('form-examen-real').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (preguntasCargadas.length === 0) return;

    const btn = document.getElementById('btn-enviar-examen');
    btn.disabled = true;
    btn.innerText = 'Evaluando respuestas en servidor...';

    const area = document.getElementById('select-area-examen').value;
    const nivel = parseInt(document.getElementById('select-nivel-examen').value, 10);

    const respuestasMap = {};
    preguntasCargadas.forEach(p => {
        const seleccionada = document.querySelector(`input[name="preg_${p.id}"]:checked`)?.value;
        respuestasMap[p.id] = seleccionada;
    });

    const duracionSegundos = tiempoInicioExamen ? Math.round((Date.now() - tiempoInicioExamen) / 1000) : 0;

    try {
        const { data: resultado, error } = await supabaseClient.rpc('calificar_evaluacion_nivel', {
            p_correo: usuarioActivo.correo,
            p_nombre: `${usuarioActivo.nombre} ${usuarioActivo.apellidos || ''}`.trim(),
            p_area: area,
            p_nivel: nivel,
            p_respuestas: respuestasMap,
            p_duracion: duracionSegundos
        });

        if (error) throw error;
        if (resultado.error) {
            alert(resultado.error);
            return;
        }

        document.getElementById('res-intento-num').innerText = `Nivel ${nivel} • Intento #${resultado.intento}`;
        document.getElementById('res-puntaje').innerText = resultado.puntaje;
        document.getElementById('res-puesto').innerText = resultado.puesto;

        const detalleHTML = resultado.detalle.map((d, idx) => d.correcta
            ? `<p class="text-emerald-700">✅ <strong>Reactivo ${idx + 1}:</strong> ${d.explicacion}</p>`
            : `<p class="text-red-700">❌ <strong>Reactivo ${idx + 1}:</strong> ${d.explicacion}</p>`
        ).join('');

        document.getElementById('res-feedback-detalle').innerHTML = detalleHTML;

        const btnSiguiente = document.getElementById('btn-siguiente-nivel');
        if (resultado.aprobado && nivel < 10) {
            siguienteNivelDesbloqueado = resultado.siguiente_nivel;
            btnSiguiente.innerHTML = `Avanzar al Nivel ${siguienteNivelDesbloqueado} <i class="fa-solid fa-arrow-right ml-1"></i>`;
            btnSiguiente.classList.remove('hidden');

            // Desbloquear inmediatamente en el selector desplegable
            const selectNivel = document.getElementById('select-nivel-examen');
            const optSiguiente = selectNivel.querySelector(`option[value="${siguienteNivelDesbloqueado}"]`);
            if (optSiguiente) {
                optSiguiente.disabled = false;
                optSiguiente.text = `Nivel ${siguienteNivelDesbloqueado} (Desbloqueado)`;
            }
        } else {
            btnSiguiente.classList.add('hidden');
        }

        document.getElementById('resultado-examen-box').classList.remove('hidden');
        cargarNotificacionesUsuario();
    } catch (err) {
        alert('Error al calificar: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Finalizar y Validar Calificación en Servidor';
    }
});

// === HISTORIAL Y CONTRATO DIGITAL DINÁMICO ===
async function cargarNotificacionesUsuario() {
    const contenedor = document.getElementById('contenedor-notificaciones-perfil');
    if (!usuarioActivo || !contenedor) return;

    const { data: evals } = await supabaseClient
        .from('evaluaciones')
        .select('*')
        .eq('usuario_correo', usuarioActivo.correo)
        .order('id', { ascending: false });

    listaEvaluacionesUsuario = evals || [];

    if (listaEvaluacionesUsuario.length === 0) {
        contenedor.innerHTML = '<p class="text-gray-600 italic">Aún no has realizado intentos de evaluación.</p>';
        return;
    }

    contenedor.innerHTML = listaEvaluacionesUsuario.map((ev, index) => {
        let colorBorde = 'border-yellow-400';
        let badge = `<span class="bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">${ev.estatus_empresa || 'En revisión'}</span>`;
        let botonContrato = '';

        if (ev.estatus_empresa === 'Seleccionado' || ev.estatus_empresa === 'Aceptado') {
            colorBorde = 'border-primary';
            badge = '<span class="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">SELECCIONADO</span>';
            botonContrato = `<button onclick="abrirContratoDinamico(${index})" class="mt-2 bg-primary hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs">Ver y Firmar Contrato Digital</button>`;
        } else if (ev.estatus_empresa === 'Entrevista') {
            colorBorde = 'border-blue-500';
            badge = '<span class="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">EN ENTREVISTA</span>';
        } else if (ev.estatus_empresa === 'No seleccionado' || ev.estatus_empresa === 'Rechazado') {
            colorBorde = 'border-danger';
            badge = '<span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">NO SELECCIONADO</span>';
        }

        const fechaTxt = ev.created_at ? new Date(ev.created_at).toLocaleDateString('es-MX') : 'Reciente';

        return `
            <div class="bg-white border-l-4 ${colorBorde} p-4 rounded-xl shadow-sm space-y-1.5">
                <div class="flex justify-between items-center">
                    <strong class="text-secondary text-sm">${ev.area || 'Evaluación'} • Nivel ${ev.nivel || 1} (Intento #${ev.numero_intento || 1}) • ${ev.puntaje}/10 (${fechaTxt})</strong>
                    ${badge}
                </div>
                <p class="text-gray-700"><strong>Perfil:</strong> ${ev.puesto_asignado} (${ev.duracion_segundos || 0} seg)</p>
                <p class="text-gray-600"><strong>Retroalimentación:</strong> ${ev.feedback_examen}</p>
                ${ev.criterio_empresa ? `<p class="text-secondary bg-gray-100 p-2 rounded-lg"><strong>Criterio Empresa:</strong> ${ev.criterio_empresa} — ${ev.feedback_empresa || ''}</p>` : ''}
                ${botonContrato}
            </div>
        `;
    }).join('');
}

function abrirContratoDinamico(index) {
    const ev = listaEvaluacionesUsuario[index];
    if (!ev) return;
    evaluacionContratoActual = ev;

    document.getElementById('modal-candidato-txt').innerText = `${usuarioActivo.nombre} ${usuarioActivo.apellidos || ''}`.trim();
    document.getElementById('modal-empresa-txt').innerText = ev.empresa_nombre || 'Empresa Verificada ODS 8';
    document.getElementById('modal-puesto-txt').innerText = ev.puesto_asignado;
    document.getElementById('modal-sueldo-txt').innerText = `$${Number(ev.sueldo_contrato || 9500).toLocaleString('es-MX')} MXN Mensuales Netos`;
    document.getElementById('modal-jornada-txt').innerText = ev.jornada_contrato || '40 horas semanales';
    document.getElementById('modal-prestaciones-txt').innerText = ev.prestaciones_contrato || 'IMSS, Aguinaldo y Vacaciones de Ley';

    const btnFirmar = document.getElementById('btn-firmar-contrato');
    const estatusTxt = document.getElementById('modal-estatus-firma');

    if (ev.contrato_firmado) {
        estatusTxt.innerText = `Firmado digitalmente el ${new Date(ev.fecha_firma).toLocaleString('es-MX')}`;
        btnFirmar.classList.add('hidden');
    } else {
        estatusTxt.innerText = 'Pendiente de firma del trabajador';
        btnFirmar.classList.remove('hidden');
    }

    document.getElementById('modal-contrato').classList.remove('hidden');
}

async function firmarContratoDigital() {
    if (!evaluacionContratoActual) return;
    const ahora = new Date().toISOString();

    const { error } = await supabaseClient
        .from('evaluaciones')
        .update({ contrato_firmado: true, fecha_firma: ahora })
        .eq('id', evaluacionContratoActual.id);

    if (error) {
        alert('Error al firmar contrato: ' + error.message);
        return;
    }

    await supabaseClient.from('auditoria_logs').insert([{
        actor: usuarioActivo.correo,
        accion: 'Firma de contrato digital',
        detalle: `Evaluación ID ${evaluacionContratoActual.id} - Puesto: ${evaluacionContratoActual.puesto_asignado}`
    }]);

    alert('✅ Contrato firmado digitalmente y registrado en auditoría.');
    document.getElementById('modal-contrato').classList.add('hidden');
    cargarNotificacionesUsuario();
}

// === CONFIGURACIÓN PWA ===
let eventoInstalacionPWA = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .catch((err) => console.error('Error SW:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacionPWA = e;
    document.getElementById('btn-instalar-pwa')?.classList.remove('hidden');
});

async function instalarPWA() {
    if (!eventoInstalacionPWA) {
        alert('Para instalar: abre el menú de tu navegador (⋮) y selecciona "Instalar aplicación".');
        return;
    }
    eventoInstalacionPWA.prompt();
    const { outcome } = await eventoInstalacionPWA.userChoice;
    if (outcome === 'accepted') {
        document.getElementById('btn-instalar-pwa')?.classList.add('hidden');
    }
    eventoInstalacionPWA = null;
}