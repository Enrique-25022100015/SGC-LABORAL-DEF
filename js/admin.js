window.onload = () => {
    if (sessionStorage.getItem('sgc_admin_auth') === 'true') {
        desbloquearPanel();
    }
};

document.getElementById('form-admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass-input').value.trim();

    try {
        // Validación en servidor Supabase (la contraseña no existe en el código JS)
        const { data: esValida, error } = await supabaseClient.rpc('validar_admin_sgc', {
            pass_input: pass
        });

        if (error) throw error;

        if (esValida) {
            sessionStorage.setItem('sgc_admin_auth', 'true');
            await registrarLogAdmin('Inicio de sesión administrativo exitoso');
            desbloquearPanel();
        } else {
            alert('❌ Contraseña de administrador incorrecta.');
        }
    } catch (err) {
        alert('Error de autenticación: ' + err.message);
    }
});

async function registrarLogAdmin(accion, detalle = '') {
    await supabaseClient.from('auditoria_logs').insert([{
        actor: 'Administrador SGC',
        accion,
        detalle
    }]);
}

function desbloquearPanel() {
    document.getElementById('admin-login-box').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    document.getElementById('btn-logout-admin').classList.remove('hidden');
    cargarTodoAdmin();
}

function cerrarSesionAdmin() {
    sessionStorage.removeItem('sgc_admin_auth');
    location.reload();
}

function mostrarTabAdmin(tabId) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
}

async function cargarTodoAdmin() {
    // 1. Usuarios
    const { data: usuarios } = await supabaseClient.from('usuarios').select('*').order('id', { ascending: false });
    const listaU = usuarios || [];
    document.getElementById('stat-usuarios').innerText = listaU.length;
    document.getElementById('tabla-admin-usuarios').innerHTML = listaU.map(u => `
        <tr>
            <td class="py-2.5 px-3 font-bold">${u.id}</td>
            <td class="py-2.5 px-3">${u.nombre} ${u.apellidos || ''}</td>
            <td class="py-2.5 px-3">${u.correo}</td>
            <td class="py-2.5 px-3">${u.visible_empresas ? 'Público (Autorizado)' : 'Privado'}</td>
            <td class="py-2.5 px-3">${u.estado || '-'}</td>
            <td class="py-2.5 px-3">
                <button onclick="eliminarRegistro('usuarios', ${u.id})" class="text-danger hover:underline font-bold">Eliminar</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="py-4 text-center text-gray-400">Sin usuarios</td></tr>';

    // 2. Empresas (con aprobación documental)
    const { data: empresas } = await supabaseClient.from('empresas').select('*').order('id', { ascending: false });
    const listaE = empresas || [];
    document.getElementById('stat-empresas').innerText = listaE.length;
    document.getElementById('tabla-admin-empresas').innerHTML = listaE.map(emp => `
        <tr>
            <td class="py-2.5 px-3 font-bold">${emp.id}</td>
            <td class="py-2.5 px-3 font-semibold">${emp.nombre_empresa}</td>
            <td class="py-2.5 px-3 font-mono">${emp.rfc}</td>
            <td class="py-2.5 px-3">${emp.verificada ? '<span class="text-primary font-bold">Verificada</span>' : '<span class="text-accent font-bold">Pendiente</span>'}</td>
            <td class="py-2.5 px-3">${emp.sector || '-'}</td>
            <td class="py-2.5 px-3 flex gap-2">
                ${!emp.verificada ? `<button onclick="aprobarEmpresa(${emp.id}, '${emp.nombre_empresa}')" class="text-primary hover:underline font-bold">Aprobar</button>` : ''}
                <button onclick="eliminarRegistro('empresas', ${emp.id})" class="text-danger hover:underline font-bold">Eliminar</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="py-4 text-center text-gray-400">Sin empresas</td></tr>';

    // 3. Evaluaciones
    const { data: evals } = await supabaseClient.from('evaluaciones').select('*').order('id', { ascending: false });
    const listaEv = evals || [];
    document.getElementById('stat-evaluaciones').innerText = listaEv.length;
    document.getElementById('tabla-admin-evaluaciones').innerHTML = listaEv.map(ev => `
        <tr>
            <td class="py-2.5 px-3 font-bold">${ev.usuario_nombre}<br><span class="font-normal text-gray-400">Intento #${ev.numero_intento || 1}</span></td>
            <td class="py-2.5 px-3 font-black text-primary">${ev.puntaje}/10</td>
            <td class="py-2.5 px-3">${ev.puesto_asignado}</td>
            <td class="py-2.5 px-3 font-bold">${ev.estatus_empresa}</td>
            <td class="py-2.5 px-3 text-gray-600">${ev.criterio_empresa || ''} ${ev.feedback_empresa || 'Sin respuesta aún'}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="py-4 text-center text-gray-400">Sin evaluaciones</td></tr>';

    // 4. Preguntas
    const { data: preguntas } = await supabaseClient.from('preguntas_examen').select('*').order('id', { ascending: true });
    const listaP = preguntas || [];
    document.getElementById('stat-preguntas').innerText = listaP.length;
    document.getElementById('lista-admin-preguntas').innerHTML = listaP.map(p => `
        <div class="p-3 bg-gray-50 border rounded-xl flex justify-between items-start gap-3">
            <div>
                <p class="text-[10px] font-bold uppercase text-primary">${p.categoria || 'General'} • ${p.dificultad || 'Intermedio'} • ${p.aprobada ? 'Aprobada' : 'Pendiente'}</p>
                <p class="font-bold text-secondary">${p.pregunta} <span class="text-primary">(Correcta: ${p.correcta})</span></p>
                <p class="text-gray-500 mt-1">Feedback: ${p.explicacion}</p>
            </div>
            <button onclick="eliminarRegistro('preguntas_examen', ${p.id})" class="text-danger font-bold shrink-0">Borrar</button>
        </div>
    `).join('');
}

async function aprobarEmpresa(id, nombre) {
    await supabaseClient.from('empresas').update({ verificada: true }).eq('id', id);
    await registrarLogAdmin('Verificación de empresa aprobada', `Empresa: ${nombre} (ID ${id})`);
    alert('✅ Empresa verificada y habilitada para contratar.');
    cargarTodoAdmin();
}

async function eliminarRegistro(tabla, id) {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    await supabaseClient.from(tabla).delete().eq('id', id);
    await registrarLogAdmin(`Eliminación en ${tabla}`, `Registro ID ${id}`);
    cargarTodoAdmin();
}

document.getElementById('form-nueva-pregunta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nueva = {
        pregunta: document.getElementById('preg-texto').value.trim(),
        opcion_a: document.getElementById('preg-a').value.trim(),
        opcion_b: document.getElementById('preg-b').value.trim(),
        opcion_c: document.getElementById('preg-c').value.trim(),
        correcta: document.getElementById('preg-correcta').value,
        explicacion: document.getElementById('preg-explicacion').value.trim(),
        categoria: document.getElementById('preg-categoria')?.value || 'Desarrollo y Lógica',
        dificultad: document.getElementById('preg-dificultad')?.value || 'Intermedio',
        aprobada: true
    };

    const { error } = await supabaseClient.from('preguntas_examen').insert([nueva]);
    if (error) {
        alert('Error: ' + error.message);
    } else {
        await registrarLogAdmin('Nueva pregunta agregada al banco', nueva.pregunta);
        alert('✅ Pregunta validada y agregada al examen.');
        e.target.reset();
        cargarTodoAdmin();
    }
});