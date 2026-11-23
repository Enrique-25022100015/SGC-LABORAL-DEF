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
        sector: document.getElementById('emp-sector').value.trim()
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
        alert('✅ Empresa registrada correctamente.');
        navTo('emp-view-perfil');
    } catch (err) {
        alert('Error al registrar empresa: ' + err.message);
    }
});

// PERFIL DE EMPRESA
function cargarPerfilEmpresa() {
    if (!empresaActiva) return;
    document.getElementById('perfil-emp-titulo').innerText = empresaActiva.nombre_empresa;
    document.getElementById('edit-emp-nombre').value = empresaActiva.nombre_empresa || '';
    document.getElementById('edit-emp-rfc').value = empresaActiva.rfc || '';
    document.getElementById('edit-emp-correo').value = empresaActiva.correo_empresa || '';
    document.getElementById('edit-emp-sector').value = empresaActiva.sector || '';
    document.getElementById('edit-emp-tamano').value = empresaActiva.tamano_negocio || '1 - 10 empleados';
}

document.getElementById('form-editar-empresa').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!empresaActiva) return;

    const cambios = {
        nombre_empresa: document.getElementById('edit-emp-nombre').value.trim(),
        rfc: document.getElementById('edit-emp-rfc').value.trim().toUpperCase(),
        sector: document.getElementById('edit-emp-sector').value.trim(),
        tamano_negocio: document.getElementById('edit-emp-tamano').value
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
        alert('✅ Datos de la empresa actualizados.');
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
    contenedor.innerHTML = '<p class="text-xs text-center text-gray-500">Cargando candidatos...</p>';

    try {
        const { data: candidatos, error } = await supabaseClient
            .from('evaluaciones')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        if (!candidatos || candidatos.length === 0) {
            contenedor.innerHTML = '<p class="text-xs text-center text-gray-500">Aún no hay candidatos evaluados.</p>';
            return;
        }

        contenedor.innerHTML = candidatos.map(c => `
            <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h4 class="font-bold text-sm text-secondary">${c.usuario_nombre} <span class="text-xs font-normal text-gray-500">(${c.usuario_correo})</span></h4>
                        <p class="text-xs text-primary font-bold">Nota Examen: ${c.puntaje}/10 • ${c.puesto_asignado}</p>
                    </div>
                    <span class="text-xs font-bold px-3 py-1 rounded-full bg-white border">${c.estatus_empresa}</span>
                </div>

                <p class="text-[11px] text-gray-600 bg-white p-2.5 rounded-xl border">
                    <strong>Diagnóstico técnico:</strong> ${c.feedback_examen}
                </p>

                <div class="space-y-2">
                    <input type="text" id="fb-emp-${c.id}" value="${c.feedback_empresa || ''}" placeholder="Motivo de contratación o rechazo para el candidato..." class="w-full border border-gray-300 rounded-xl p-2.5 text-xs">
                    <div class="flex gap-2">
                        <button onclick="decidirCandidato(${c.id}, 'Aceptado')" class="flex-1 bg-primary hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs">
                            Aceptar y Contratar
                        </button>
                        <button onclick="decidirCandidato(${c.id}, 'Rechazado')" class="flex-1 bg-danger hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs">
                            Rechazar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        contenedor.innerHTML = `<p class="text-xs text-danger">Error: ${err.message}</p>`;
    }
}

async function decidirCandidato(idEvaluacion, decision) {
    const motivo = document.getElementById(`fb-emp-${idEvaluacion}`).value.trim();
    const feedbackFinal = motivo || (decision === 'Aceptado'
        ? `Seleccionado por ${empresaActiva.nombre_empresa} tras cumplir con el perfil técnico.`
        : `Postulación declinada por ${empresaActiva.nombre_empresa}.`);

    try {
        const { error } = await supabaseClient
            .from('evaluaciones')
            .update({ estatus_empresa: decision, feedback_empresa: feedbackFinal })
            .eq('id', idEvaluacion);

        if (error) throw error;
        alert(`Candidato actualizado a "${decision}".`);
        cargarCandidatos();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}