let empresaActiva = JSON.parse(localStorage.getItem('sgc_empresa_supabase')) || null;

window.onload = () => {
    actualizarUIEmpresa();
    if (empresaActiva) {
        cargarPerfilEmpresa();
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

function actualizarUIEmpresa() {
    const status = document.getElementById('drawer-emp-status');
    const btnMain = document.getElementById('drawer-emp-btn');
    const navPerfil = document.getElementById('nav-emp-perfil');
    const navVolver = document.getElementById('nav-emp-volver-candidatos');

    if (empresaActiva) {
        status.innerText = `Empresa: ${empresaActiva.nombre_empresa}`;
        btnMain.innerHTML = `<i class="fa-solid fa-building"></i> Perfil de Empresa`;
        navPerfil.classList.remove('hidden');
        navVolver.classList.add('hidden');
    } else {
        status.innerText = 'Empresa no autenticada';
        btnMain.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Acceso Empresas`;
        navPerfil.classList.add('hidden');
        navVolver.classList.remove('hidden');
    }
}

function verificarEmpresa() {
    if (empresaActiva) {
        cargarPerfilEmpresa();
        navTo('emp-view-perfil');
    } else {
        navTo('emp-view-login');
    }
}

function cerrarSesionEmpresa() {
    empresaActiva = null;
    localStorage.removeItem('sgc_empresa_supabase');
    actualizarUIEmpresa();
    navTo('emp-view-inicio');
}

// LOGIN EMPRESA
document.getElementById('form-login-empresa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = document.getElementById('emp-login-correo').value.trim();
    const pass = document.getElementById('emp-login-pass').value.trim();

    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('*')
            .eq('correo_empresa', correo)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            alert('No encontramos una empresa con ese correo. Regístrala en el formulario de al lado.');
            return;
        }
        if (data.password && data.password !== pass) {
            alert('Contraseña incorrecta.');
            return;
        }

        empresaActiva = data;
        localStorage.setItem('sgc_empresa_supabase', JSON.stringify(empresaActiva));
        actualizarUIEmpresa();
        cargarPerfilEmpresa();
        navTo('emp-view-perfil');
    } catch (err) {
        alert('Error al iniciar sesión: ' + err.message);
    }
});

// REGISTRO EMPRESA
document.getElementById('form-registro-empresa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevaEmpresa = {
        nombre_empresa: document.getElementById('emp-nombre').value.trim(),
        rfc: document.getElementById('emp-rfc').value.trim().toUpperCase(),
        correo_empresa: document.getElementById('emp-correo').value.trim(),
        password: document.getElementById('emp-pass').value.trim(),
        tamano_negocio: document.getElementById('emp-tamano').value,
        sector: document.getElementById('emp-sector').value.trim(),
        verificada: false
    };

    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .insert([nuevaEmpresa])
            .select()
            .single();

        if (error) throw error;

        empresaActiva = data;
        localStorage.setItem('sgc_empresa_supabase', JSON.stringify(empresaActiva));
        actualizarUIEmpresa();
        cargarPerfilEmpresa();
        alert('✅ Empresa registrada. Un administrador validará tu RFC para habilitar contrataciones.');
        navTo('emp-view-perfil');
    } catch (err) {
        alert('Error al registrar empresa: ' + err.message);
    }
});

// PERFIL DE EMPRESA Y FILTRO TRABAJO DECENTE
function cargarPerfilEmpresa() {
    if (!empresaActiva) return;
    document.getElementById('perfil-emp-titulo').innerText = empresaActiva.nombre_empresa;
    const badge = document.getElementById('badge-verificacion-emp');
    if (empresaActiva.verificada) {
        badge.innerText = 'Empresa Verificada • Sello ODS 8';
        badge.className = 'text-[10px] uppercase font-bold text-emerald-400';
    } else {
        badge.innerText = 'Estatus: Pendiente de Validación RFC por Admin';
        badge.className = 'text-[10px] uppercase font-bold text-amber-400';
    }

    document.getElementById('edit-emp-nombre').value = empresaActiva.nombre_empresa || '';
    document.getElementById('edit-emp-rfc').value = empresaActiva.rfc || '';
    document.getElementById('edit-emp-correo').value = empresaActiva.correo_empresa || '';
    document.getElementById('edit-emp-sector').value = empresaActiva.sector || '';
    document.getElementById('edit-emp-tamano').value = empresaActiva.tamano_negocio || '1 - 10 empleados';
    document.getElementById('edit-emp-sueldo').value = empresaActiva.sueldo_ofrecido || 9500;
    if (empresaActiva.jornada) {
        document.getElementById('edit-emp-jornada').value = empresaActiva.jornada;
    }
}

document.getElementById('form-editar-empresa').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!empresaActiva) return;

    const sueldo = Number(document.getElementById('edit-emp-sueldo').value);
    if (sueldo < 8364) {
        alert('⛔ Bloqueo Salarial (Arts. 85 y 90 LFT): El sueldo base mensual debe ser igual o superior al Salario Mínimo General vigente ($8,364 MXN).');
        return;
    }

    const cambios = {
        nombre_empresa: document.getElementById('edit-emp-nombre').value.trim(),
        rfc: document.getElementById('edit-emp-rfc').value.trim().toUpperCase(),
        sector: document.getElementById('edit-emp-sector').value.trim(),
        tamano_negocio: document.getElementById('edit-emp-tamano').value,
        sueldo_ofrecido: sueldo,
        jornada: document.getElementById('edit-emp-jornada').value,
        prestaciones: 'IMSS, INFONAVIT (5%), AFORE, Aguinaldo 15 días, Vacaciones 12 días + 25% Prima Vacacional'
    };

    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .update(cambios)
            .eq('correo_empresa', empresaActiva.correo_empresa)
            .select()
            .single();

        if (error) throw error;
        empresaActiva = data;
        localStorage.setItem('sgc_empresa_supabase', JSON.stringify(empresaActiva));
        document.getElementById('perfil-emp-titulo').innerText = empresaActiva.nombre_empresa;
        alert('✅ Datos corporativos y condiciones auditadas LFT guardados.');
    } catch (err) {
        alert('Error al actualizar: ' + err.message);
    }
});

// CANDIDATOS
function irACandidatos() {
    if (!empresaActiva) {
        alert('Inicia sesión con tu cuenta de empresa para revisar candidatos.');
        navTo('emp-view-login');
        return;
    }
    navTo('emp-view-candidatos');
    cargarCandidatos();
}

async function cargarCandidatos() {
    const contenedor = document.getElementById('lista-candidatos-empresa');
    if (!empresaActiva.verificada) {
        contenedor.innerHTML = `<div class="bg-amber-50 border border-amber-300 p-4 rounded-2xl text-xs text-amber-900">
            <strong>⏳ Empresa pendiente de verificación documental:</strong> El administrador debe validar tu RFC (${empresaActiva.rfc}) antes de habilitar la consulta y contratación de candidatos.
        </div>`;
        return;
    }

    contenedor.innerHTML = '<p class="text-xs text-center text-gray-500">Cargando candidatos autorizados...</p>';

    try {
        const { data: usuariosAutorizados } = await supabaseClient
            .from('usuarios')
            .select('correo, escolaridad, habilidades, experiencia, portafolio_url')
            .eq('visible_empresas', true);

        const correosPermitidos = (usuariosAutorizados || []).map(u => u.correo);
        if (correosPermitidos.length === 0) {
            contenedor.innerHTML = '<p class="text-xs text-center text-gray-500">No hay candidatos con perfil público autorizado por el momento.</p>';
            return;
        }

        const { data: candidatos, error } = await supabaseClient
            .from('evaluaciones')
            .select('*')
            .in('usuario_correo', correosPermitidos)
            .order('id', { ascending: false });

        if (error) throw error;

        if (!candidatos || candidatos.length === 0) {
            contenedor.innerHTML = '<p class="text-xs text-center text-gray-500">Aún no hay candidatos evaluados con perfil público.</p>';
            return;
        }

        contenedor.innerHTML = candidatos.map(c => {
            const perfil = usuariosAutorizados.find(u => u.correo === c.usuario_correo) || {};
            const contactoVisible = (c.estatus_empresa === 'Seleccionado' || c.estatus_empresa === 'Aceptado')
                ? c.usuario_correo
                : 'Oculto por privacidad (Blind Hiring) hasta selección';

            return `
            <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h4 class="font-bold text-sm text-secondary">${c.usuario_nombre} <span class="text-[11px] font-normal text-gray-500">(${contactoVisible})</span></h4>
                        <p class="text-xs text-primary font-bold">Nota: ${c.puntaje}/10 (Intento #${c.numero_intento || 1}) • ${c.puesto_asignado}</p>
                        <p class="text-[11px] text-gray-600 mt-1"><strong>Formación:</strong> ${perfil.escolaridad || 'No especificada'} | <strong>Habilidades:</strong> ${perfil.habilidades || 'No especificadas'}</p>
                    </div>
                    <span class="text-xs font-bold px-3 py-1 rounded-full bg-white border">${c.estatus_empresa}</span>
                </div>

                <p class="text-[11px] text-gray-700 bg-white p-2.5 rounded-xl border">
                    <strong>Diagnóstico de competencias:</strong> ${c.feedback_examen}
                </p>

                <div class="space-y-2">
                    <select id="crit-emp-${c.id}" class="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-semibold">
                        <option value="Cumple dominio técnico y nivel requerido">Criterio: Cumple dominio técnico y nivel requerido</option>
                        <option value="Destaca en habilidades transversales y empleabilidad">Criterio: Destaca en habilidades transversales y empleabilidad</option>
                        <option value="Requiere entrevista técnica complementaria">Criterio: Requiere entrevista técnica complementaria</option>
                        <option value="No alcanza el puntaje mínimo requerido para la vacante">Criterio: No alcanza el puntaje mínimo requerido para la vacante</option>
                    </select>
                    <input type="text" id="fb-emp-${c.id}" value="${c.feedback_empresa || ''}" placeholder="Justificación obligatoria de la decisión (Revisión humana)..." class="w-full border border-gray-300 rounded-xl p-2.5 text-xs" required>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="decidirCandidato(${c.id}, 'Entrevista')" class="flex-1 bg-secondary hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs">
                            Citar a Entrevista
                        </button>
                        <button onclick="decidirCandidato(${c.id}, 'Seleccionado')" class="flex-1 bg-primary hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs">
                            Seleccionar y Generar Contrato
                        </button>
                        <button onclick="decidirCandidato(${c.id}, 'No seleccionado')" class="flex-1 bg-danger hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs">
                            No Seleccionar
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        contenedor.innerHTML = `<p class="text-xs text-danger">Error: ${err.message}</p>`;
    }
}

async function decidirCandidato(idEvaluacion, decision) {
    const criterio = document.getElementById(`crit-emp-${idEvaluacion}`).value;
    const motivo = document.getElementById(`fb-emp-${idEvaluacion}`).value.trim();

    if (!motivo) {
        alert('⚠️ Debes escribir una justificación objetiva antes de registrar la decisión.');
        return;
    }

    const payload = {
        estatus_empresa: decision,
        criterio_empresa: criterio,
        feedback_empresa: motivo
    };

    if (decision === 'Seleccionado') {
        payload.empresa_nombre = empresaActiva.nombre_empresa;
        payload.sueldo_contrato = empresaActiva.sueldo_ofrecido || 9500;
        payload.jornada_contrato = empresaActiva.jornada || 'Diurna: 40 horas semanales (Lunes a Viernes)';
        payload.prestaciones_contrato = empresaActiva.prestaciones || 'IMSS, INFONAVIT (5%), AFORE, Aguinaldo 15 días, Vacaciones 12 días + 25% Prima Vacacional';
    }

    try {
        const { error } = await supabaseClient
            .from('evaluaciones')
            .update(payload)
            .eq('id', idEvaluacion);

        if (error) throw error;

        await supabaseClient.from('auditoria_logs').insert([{
            actor: empresaActiva.nombre_empresa,
            accion: `Decisión empresarial: ${decision}`,
            detalle: `Evaluación ID ${idEvaluacion} - Criterio: ${criterio}`
        }]);

        alert(`✅ Decisión "${decision}" registrada con éxito.`);
        cargarCandidatos();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}