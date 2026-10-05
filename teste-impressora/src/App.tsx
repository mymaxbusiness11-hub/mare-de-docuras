import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  App as CapacitorApp,
} from '@capacitor/app'

import {
  BleClient,
  type ScanResult,
} from '@capacitor-community/bluetooth-le'

import { supabase } from './supabase'

const SERVICE_UUID =
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2'

const WRITE_UUID =
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'

type ItemPedido = {
  nome: string
  quantidade: number
  preco: number
  subtotal: number
  options?: string | null
}

type Pedido = {
  numero: number
  cliente: string
  telefone?: string | null
  tipo?: string | null
  endereco?: string | null
  pagamento?: string | null
  itens: ItemPedido[]
  total: number
}

function App() {
  const [devices, setDevices] =
    useState<ScanResult[]>([])

  const [scanning, setScanning] =
    useState(false)

  const [connectedDevice, setConnectedDevice] =
    useState<string | null>(null)

  const [connectedName, setConnectedName] =
    useState('')

  const [message, setMessage] =
    useState(
      'Aguardando conexão com a impressora...'
    )

  const [imprimindo, setImprimindo] =
    useState(false)

  const [pedido, setPedido] =
    useState<Pedido | null>(null)

  const connectedDeviceRef =
    useRef<string | null>(null)

  const processandoLink =
    useRef(false)

  useEffect(() => {
    connectedDeviceRef.current =
      connectedDevice
  }, [connectedDevice])

  // ============================================================
  // INICIALIZAÇÃO DO APLICATIVO
  // ============================================================

  useEffect(() => {
    let listener:
      | Awaited<
          ReturnType<
            typeof CapacitorApp.addListener
          >
        >
      | null = null

    const iniciar = async () => {
      try {
        await BleClient.initialize()
      } catch (error) {
        console.error(
          'Erro ao inicializar Bluetooth:',
          error
        )
      }

      // --------------------------------------------------------
      // RECEBER LINK ENQUANTO O APP JÁ ESTÁ ABERTO
      // --------------------------------------------------------

      listener =
        await CapacitorApp.addListener(
          'appUrlOpen',
          ({ url }) => {
            console.log(
              'LINK RECEBIDO:',
              url
            )

            void processarLink(
              url
            )
          }
        )

      // --------------------------------------------------------
      // RECEBER LINK QUANDO O APP É ABERTO PELO LINK
      // --------------------------------------------------------

      try {
        const launch =
          await CapacitorApp.getLaunchUrl()

        if (launch?.url) {
          console.log(
            'LINK DE ABERTURA:',
            launch.url
          )

          void processarLink(
            launch.url
          )
        }
      } catch (error) {
        console.error(
          'Erro ao verificar link inicial:',
          error
        )
      }

      // --------------------------------------------------------
      // TENTAR RECONECTAR IMPRESSORA SALVA
      // --------------------------------------------------------

      const dispositivoSalvo =
        localStorage.getItem(
          'mareprint_device_id'
        )

      const nomeSalvo =
        localStorage.getItem(
          'mareprint_device_name'
        )

      if (
        dispositivoSalvo &&
        nomeSalvo
      ) {
        setMessage(
          `Reconectando em ${nomeSalvo}...`
        )

        try {
          await conectarPorId(
            dispositivoSalvo,
            nomeSalvo
          )
        } catch (error) {
          console.error(
            'Não foi possível reconectar automaticamente:',
            error
          )

          setMessage(
            'Impressora não conectada. Selecione-a novamente.'
          )
        }
      }
    }

    void iniciar()

    return () => {
      if (listener) {
        void listener.remove()
      }
    }
  }, [])

  // ============================================================
  // PROCESSAR mareprint://print?order_id=123
  // ============================================================

  const processarLink = async (
    url: string
  ) => {
    if (
      !url.startsWith(
        'mareprint://'
      )
    ) {
      return
    }

    if (processandoLink.current) {
      return
    }

    processandoLink.current = true

    try {
      console.log(
        'Processando link:',
        url
      )

      const urlObj =
        new URL(url)

      const orderIdTexto =
        urlObj.searchParams.get(
          'order_id'
        )

      if (!orderIdTexto) {
        setMessage(
          '❌ Nenhum pedido foi informado.'
        )

        return
      }

      const orderId =
        Number(orderIdTexto)

      if (
        !Number.isFinite(
          orderId
        )
      ) {
        setMessage(
          '❌ ID do pedido inválido.'
        )

        return
      }

      setMessage(
        `📦 Pedido #${orderId} recebido.`
      )

      await carregarPedidoEImprimir(
        orderId
      )
    } catch (error) {
      console.error(
        'ERRO AO PROCESSAR LINK:',
        error
      )

      setMessage(
        '❌ Não foi possível processar o pedido.'
      )
    } finally {
      processandoLink.current =
        false
    }
  }

  // ============================================================
  // CARREGAR PEDIDO DO SUPABASE
  // ============================================================

  const carregarPedido = async (
    orderId: number
  ): Promise<Pedido | null> => {
    setMessage(
      `🔎 Buscando pedido #${orderId}...`
    )

    // --------------------------------------------------------
    // BUSCAR PEDIDO
    // Não usamos .single() para evitar:
    // "cannot coerce the result to a single JSON object"
    // --------------------------------------------------------

    const {
      data: orders,
      error: orderError,
    } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .limit(1)

    console.log(
      'RESULTADO DA BUSCA DO PEDIDO:',
      orders
    )

    if (orderError) {
      console.error(
        'ERRO AO BUSCAR PEDIDO:',
        orderError
      )

      console.error(
        'ERRO SUPABASE MESSAGE:',
        orderError.message
      )

      console.error(
        'ERRO SUPABASE DETAILS:',
        orderError.details
      )

      console.error(
        'ERRO SUPABASE HINT:',
        orderError.hint
      )

      console.error(
        'ERRO SUPABASE CODE:',
        orderError.code
      )

      setMessage(
        `❌ Erro Supabase: ${
          orderError.message ||
          'erro desconhecido'
        }`
      )

      return null
    }

    // --------------------------------------------------------
    // NENHUM PEDIDO ENCONTRADO
    // --------------------------------------------------------

    if (
      !orders ||
      orders.length === 0
    ) {
      console.error(
        'NENHUM PEDIDO ENCONTRADO PARA O ID:',
        orderId
      )

      setMessage(
        `❌ Nenhum pedido encontrado para o ID #${orderId}.`
      )

      return null
    }

    // --------------------------------------------------------
    // PEGAR O PRIMEIRO PEDIDO ENCONTRADO
    // --------------------------------------------------------

    const order =
      orders[0]

    console.log(
      'PEDIDO ENCONTRADO:',
      order
    )

    // --------------------------------------------------------
    // BUSCAR ITENS DO PEDIDO
    // --------------------------------------------------------

    const {
      data: items,
      error: itemsError,
    } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('id', {
        ascending: true,
      })

    if (itemsError) {
      console.error(
        'ERRO AO BUSCAR ITENS:',
        itemsError
      )

      console.error(
        'ERRO ITENS MESSAGE:',
        itemsError.message
      )

      console.error(
        'ERRO ITENS DETAILS:',
        itemsError.details
      )

      console.error(
        'ERRO ITENS HINT:',
        itemsError.hint
      )

      console.error(
        'ERRO ITENS CODE:',
        itemsError.code
      )

      setMessage(
        `❌ Erro ao carregar itens: ${
          itemsError.message ||
          'erro desconhecido'
        }`
      )

      return null
    }

    console.log(
      'ITENS DO PEDIDO:',
      items
    )

    // --------------------------------------------------------
    // TRANSFORMAR ITENS
    // --------------------------------------------------------

    const itens: ItemPedido[] =
      (items || []).map(
        (item: any) => {
          const quantidade =
            Number(
              item.quantity || 0
            )

          const preco =
            Number(
              item.unit_price || 0
            )

          const subtotal =
            Number(
              item.subtotal ??
                quantidade * preco
            )

          let options =
            item.options

          if (
            options &&
            typeof options !==
              'string'
          ) {
            try {
              options =
                JSON.stringify(
                  options
                )
            } catch {
              options =
                String(options)
            }
          }

          return {
            nome:
              item.product_name ||
              'Produto',

            quantidade,

            preco,

            subtotal,

            options:
              options || null,
          }
        }
      )

    // --------------------------------------------------------
    // CALCULAR TOTAL DOS ITENS
    // --------------------------------------------------------

    const totalCalculado =
      itens.reduce(
        (soma, item) =>
          soma +
          item.subtotal,
        0
      )

    // --------------------------------------------------------
    // MONTAR PEDIDO REAL
    // --------------------------------------------------------

    const pedidoReal: Pedido = {
      numero:
        Number(order.id),

      cliente:
        order.customer_name ||
        'Cliente',

      telefone:
        order.customer_phone ||
        null,

      tipo:
        order.order_type ||
        null,

      endereco:
        order.address ||
        null,

      pagamento:
        order.payment_method ||
        null,

      itens,

      total:
        Number(
          order.total ??
            totalCalculado
        ),
    }

    console.log(
      'PEDIDO FINAL:',
      pedidoReal
    )

    return pedidoReal
  }

  // ============================================================
  // CARREGAR E IMPRIMIR
  // ============================================================

  const carregarPedidoEImprimir =
    async (
      orderId: number
    ) => {
      const pedidoReal =
        await carregarPedido(
          orderId
        )

      if (!pedidoReal) {
        return
      }

      setPedido(
        pedidoReal
      )

      // --------------------------------------------------------
      // VERIFICAR IMPRESSORA ATUAL
      // --------------------------------------------------------

      let deviceId =
        connectedDeviceRef.current

      // --------------------------------------------------------
      // SE NÃO ESTIVER CONECTADA, TENTAR A SALVA
      // --------------------------------------------------------

      if (!deviceId) {
        const salvo =
          localStorage.getItem(
            'mareprint_device_id'
          )

        const nomeSalvo =
          localStorage.getItem(
            'mareprint_device_name'
          )

        if (
          salvo &&
          nomeSalvo
        ) {
          try {
            setMessage(
              `🔌 Conectando em ${nomeSalvo}...`
            )

            await conectarPorId(
              salvo,
              nomeSalvo
            )

            deviceId =
              salvo
          } catch (error) {
            console.error(
              'Erro ao reconectar:',
              error
            )

            setMessage(
              '⚠️ Pedido recebido, mas a impressora não está conectada.'
            )

            return
          }
        }
      }

      // --------------------------------------------------------
      // AINDA SEM IMPRESSORA
      // --------------------------------------------------------

      if (!deviceId) {
        setMessage(
          '⚠️ Pedido recebido. Conecte uma impressora para imprimir.'
        )

        return
      }

      // --------------------------------------------------------
      // IMPRIMIR
      // --------------------------------------------------------

      await imprimirPedido(
        pedidoReal,
        deviceId
      )
    }

  // ============================================================
  // FORMATAR DINHEIRO
  // ============================================================

  const dinheiro = (
    valor: number
  ) => {
    return Number(
      valor || 0
    )
      .toFixed(2)
      .replace('.', ',')
  }

  // ============================================================
  // REMOVER ACENTOS
  // ============================================================

  const semAcentos = (
    texto: string
  ) => {
    return texto
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
  }

  // ============================================================
  // PROCURAR IMPRESSORA
  // ============================================================

  const procurarImpressora =
    async () => {
      setDevices([])

      setMessage(
        'Procurando impressoras Bluetooth...'
      )

      setScanning(true)

      try {
        await BleClient.initialize()

        await BleClient.requestLEScan(
          {},
          (result) => {
            if (
              !result.device
            ) {
              return
            }

            setDevices(
              (anteriores) => {
                const existe =
                  anteriores.some(
                    (item) =>
                      item.device
                        .deviceId ===
                      result.device
                        .deviceId
                  )

                if (existe) {
                  return anteriores
                }

                return [
                  ...anteriores,
                  result,
                ]
              }
            )
          }
        )

        setTimeout(
          async () => {
            try {
              await BleClient.stopLEScan()
            } catch (error) {
              console.error(
                'Erro ao parar busca:',
                error
              )
            }

            setScanning(false)

            setMessage(
              'Busca finalizada. Selecione sua impressora.'
            )
          },
          8000
        )
      } catch (error) {
        console.error(
          'ERRO AO PROCURAR:',
          error
        )

        setScanning(false)

        setMessage(
          'Não foi possível procurar dispositivos Bluetooth.'
        )
      }
    }

  // ============================================================
  // CONECTAR POR ID
  // ============================================================

  const conectarPorId =
    async (
      deviceId: string,
      nome: string
    ) => {
      setMessage(
        `Conectando em ${nome}...`
      )

      await BleClient.connect(
        deviceId,
        (
          deviceIdDesconectado
        ) => {
          console.log(
            'Dispositivo desconectado:',
            deviceIdDesconectado
          )

          setConnectedDevice(
            null
          )

          connectedDeviceRef.current =
            null

          setConnectedName(
            ''
          )

          setMessage(
            'Impressora desconectada.'
          )
        }
      )

      await BleClient.discoverServices(
        deviceId
      )

      const services =
        await BleClient.getServices(
          deviceId
        )

      console.log(
        'SERVIÇOS DA IMPRESSORA:',
        services
      )

      setConnectedDevice(
        deviceId
      )

      connectedDeviceRef.current =
        deviceId

      setConnectedName(
        nome
      )

      localStorage.setItem(
        'mareprint_device_id',
        deviceId
      )

      localStorage.setItem(
        'mareprint_device_name',
        nome
      )

      setMessage(
        '🟢 Impressora conectada e pronta!'
      )
    }

  // ============================================================
  // CONECTAR
  // ============================================================

  const conectar = async (
    deviceId: string,
    nome: string
  ) => {
    try {
      await conectarPorId(
        deviceId,
        nome
      )
    } catch (error) {
      console.error(
        'ERRO AO CONECTAR:',
        error
      )

      setConnectedDevice(
        null
      )

      connectedDeviceRef.current =
        null

      setConnectedName(
        ''
      )

      setMessage(
        `Não foi possível conectar em ${nome}.`
      )
    }
  }

  // ============================================================
  // TESTAR SUPABASE
  // ============================================================

  const testarSupabase =
  async () => {
    setMessage(
      '🔎 Consultando pedidos...'
    )

    try {
      const {
        data,
        error,
      } = await supabase
        .from('orders')
        .select(
          'id, customer_name, total, created_at'
        )
        .order('id', {
          ascending: false,
        })
        .limit(10)

      if (error) {
        console.error(
          'ERRO ORDERS:',
          error
        )

        setMessage(
          `❌ ERRO: ${error.message}`
        )

        return
      }

      console.log(
        'PEDIDOS ENCONTRADOS:',
        data
      )

      if (!data || data.length === 0) {
        setMessage(
          '⚠️ Supabase conectado, mas 0 pedidos encontrados.'
        )

        return
      }

      setMessage(
        `🟢 ENCONTRADOS ${data.length} PEDIDOS: ` +
        data
          .map((pedido) => `#${pedido.id}`)
          .join(', ')
      )
    } catch (error) {
      console.error(
        'ERRO AO CONSULTAR ORDERS:',
        error
      )

      setMessage(
        '❌ Erro inesperado ao consultar pedidos.'
      )
    }
  }

  // ============================================================
  // ESC/POS
  // ============================================================

  const gerarTextoImpressao =
    (
      pedidoAtual: Pedido
    ) => {
      const ESC = '\x1B'

      const CENTRALIZAR =
        `${ESC}\x61\x01`

      const ESQUERDA =
        `${ESC}\x61\x00`

      const NEGRITO_ON =
        `${ESC}\x45\x01`

      const NEGRITO_OFF =
        `${ESC}\x45\x00`

      const RESET =
        `${ESC}\x40`

      let texto = ''

      // --------------------------------------------------------
      // RESET
      // --------------------------------------------------------

      texto += RESET

      // --------------------------------------------------------
      // CABEÇALHO
      // --------------------------------------------------------

      texto +=
        CENTRALIZAR

      texto +=
        NEGRITO_ON

      texto +=
        'MARE DE DOCURAS\r\n'

      texto +=
        NEGRITO_OFF

      texto +=
        `PEDIDO #${String(
          pedidoAtual.numero
        ).padStart(3, '0')}\r\n`

      texto +=
        '------------------------------\r\n'

      // --------------------------------------------------------
      // CLIENTE
      // --------------------------------------------------------

      texto +=
        ESQUERDA

      texto +=
        `Cliente: ${semAcentos(
          pedidoAtual.cliente
        )}\r\n`

      if (
        pedidoAtual.telefone
      ) {
        texto +=
          `Telefone: ${semAcentos(
            pedidoAtual.telefone
          )}\r\n`
      }

      if (
        pedidoAtual.tipo
      ) {
        const tipo =
          pedidoAtual.tipo
            .toLowerCase() ===
          'delivery'
            ? 'ENTREGA'
            : 'RETIRADA'

        texto +=
          `Tipo: ${tipo}\r\n`
      }

      if (
        pedidoAtual.endereco
      ) {
        texto +=
          `Endereco: ${semAcentos(
            pedidoAtual.endereco
          )}\r\n`
      }

      if (
        pedidoAtual.pagamento
      ) {
        texto +=
          `Pagamento: ${semAcentos(
            pedidoAtual.pagamento
          )}\r\n`
      }

      texto +=
        '\r\n'

      // --------------------------------------------------------
      // ITENS
      // --------------------------------------------------------

      pedidoAtual.itens.forEach(
        (item) => {
          texto +=
            `${item.quantidade}x ${semAcentos(
              item.nome
            )}\r\n`

          if (
            item.options
          ) {
            texto +=
              `   ${semAcentos(
                item.options
              )}\r\n`
          }

          texto +=
            `   R$ ${dinheiro(
              item.subtotal
            )}\r\n`

          texto +=
            '\r\n'
        }
      )

            // --------------------------------------------------------
      // VALORES
      // --------------------------------------------------------

      const subtotal = pedidoAtual.itens.reduce(
        (soma, item) =>
          soma + Number(item.subtotal || 0),
        0
      )

      const ehEntrega =
        pedidoAtual.tipo?.toLowerCase() ===
        'delivery'

      const entrega = ehEntrega
        ? Math.max(
            0,
            Number(pedidoAtual.total || 0) -
              subtotal
          )
        : 0

      texto +=
        '------------------------------\r\n'

      texto +=
        `Subtotal: R$ ${dinheiro(
          subtotal
        )}\r\n`

      if (ehEntrega) {
        texto +=
          `Entrega: R$ ${dinheiro(
            entrega
          )}\r\n`
      }

      texto +=
        NEGRITO_ON

      texto +=
        `TOTAL: R$ ${dinheiro(
          pedidoAtual.total
        )}\r\n`

      texto +=
        NEGRITO_OFF

      texto +=
        '------------------------------\r\n'

      texto +=
        '\r\n'

      return texto
    }

  // ============================================================
  // ENVIAR EM BLOCOS
  // ============================================================

  const enviarEmBlocos =
    async (
      deviceId: string,
      bytes: Uint8Array
    ) => {
      const tamanhoBloco =
        180

      for (
        let i = 0;
        i < bytes.length;
        i += tamanhoBloco
      ) {
        const bloco =
          bytes.slice(
            i,
            i + tamanhoBloco
          )

        const data =
          new DataView(
            bloco.buffer,
            bloco.byteOffset,
            bloco.byteLength
          )

        await BleClient.writeWithoutResponse(
          deviceId,
          SERVICE_UUID,
          WRITE_UUID,
          data
        )

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              25
            )
        )
      }
    }

  // ============================================================
  // IMPRIMIR PEDIDO REAL
  // ============================================================

  const imprimirPedido =
    async (
      pedidoAtual: Pedido,
      deviceId?: string
    ) => {
      const dispositivo =
        deviceId ||
        connectedDeviceRef.current

      if (!dispositivo) {
        setMessage(
          'Conecte a impressora primeiro.'
        )

        return
      }

      if (imprimindo) {
        return
      }

      setImprimindo(
        true
      )

      setMessage(
        `🖨️ Imprimindo pedido #${pedidoAtual.numero}...`
      )

      try {
        const texto =
          gerarTextoImpressao(
            pedidoAtual
          )

        console.log(
          'TEXTO ENVIADO:',
          texto
        )

        const bytes =
          new TextEncoder().encode(
            texto
          )

        await enviarEmBlocos(
          dispositivo,
          bytes
        )

        setMessage(
          `✅ Pedido #${pedidoAtual.numero} impresso com sucesso!`
        )
      } catch (error) {
        console.error(
          'ERRO AO IMPRIMIR:',
          error
        )

        setMessage(
          '❌ Erro ao enviar impressão.'
        )
      } finally {
        setImprimindo(
          false
        )
      }
    }

  // ============================================================
  // TESTE MANUAL
  // ============================================================

  const imprimirTeste =
    async () => {
      const pedidoTeste: Pedido =
        {
          numero: 1,
          cliente:
            'Guilherme',
          itens: [
            {
              nome:
                'Brigadeiro',
              quantidade: 2,
              preco: 5,
              subtotal: 10,
            },
            {
              nome:
                'Brownie',
              quantidade: 1,
              preco: 8,
              subtotal: 8,
            },
          ],
          total: 18,
        }

      setPedido(
        pedidoTeste
      )

      await imprimirPedido(
        pedidoTeste
      )
    }

  // ============================================================
  // INTERFACE
  // ============================================================

  return (
    <div
      style={{
        minHeight:
          '100vh',
        background:
          'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
        color:
          '#172033',
        fontFamily:
          'Arial, Helvetica, sans-serif',
        padding: '20px',
        boxSizing:
          'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth:
            '480px',
          margin:
            '0 auto',
        }}
      >
        {/* CABEÇALHO */}

        <div
          style={{
            background:
              '#ffffff',
            borderRadius:
              '24px',
            padding:
              '28px 22px',
            textAlign:
              'center',
            boxShadow:
              '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              margin:
                '0 auto 15px',
              borderRadius:
                '20px',
              background:
                '#079FA6',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              fontSize: 34,
            }}
          >
            🖨️
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            Maré de Doçuras
          </h1>

          <p
            style={{
              margin:
                '8px 0 0',
              color:
                '#64748b',
              fontSize: 14,
            }}
          >
            Ponte de impressão
          </p>
        </div>

        {/* STATUS */}

        <div
          style={{
            marginTop: 16,
            background:
              connectedDevice
                ? '#ecfdf5'
                : '#ffffff',
            border:
              connectedDevice
                ? '1px solid #86efac'
                : '1px solid #e2e8f0',
            borderRadius:
              18,
            padding: 18,
          }}
        >
          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius:
                  '50%',
                background:
                  connectedDevice
                    ? '#16a34a'
                    : '#94a3b8',
                display:
                  'inline-block',
              }}
            />

            <strong>
              {connectedDevice
                ? 'Impressora conectada'
                : 'Impressora desconectada'}
            </strong>
          </div>

          {connectedDevice &&
            connectedName && (
              <div
                style={{
                  marginTop:
                    10,
                  color:
                    '#475569',
                  fontSize: 14,
                }}
              >
                {connectedName}
              </div>
            )}

          <div
            style={{
              marginTop:
                10,
              color:
                '#64748b',
              fontSize: 14,
            }}
          >
            {message}
          </div>
        </div>

        {/* PROCURAR */}

        <button
          onClick={
            procurarImpressora
          }
          disabled={
            scanning
          }
          style={{
            width:
              '100%',
            marginTop:
              16,
            padding:
              '17px 20px',
            border:
              'none',
            borderRadius:
              16,
            background:
              scanning
                ? '#94a3b8'
                : '#172033',
            color:
              '#ffffff',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {scanning
            ? '🔎 Procurando...'
            : '🔎 Procurar impressora'}
        </button>

        {/* DISPOSITIVOS */}

        {devices.length >
          0 && (
          <div
            style={{
              marginTop:
                16,
            }}
          >
            <p
              style={{
                fontWeight:
                  700,
                marginBottom:
                  10,
              }}
            >
              Dispositivos encontrados
            </p>

            {devices.map(
              (item) => {
                const nome =
                  item.device
                    .name ||
                  'Dispositivo Bluetooth'

                const id =
                  item.device
                    .deviceId

                return (
                  <button
                    key={id}
                    onClick={() =>
                      conectar(
                        id,
                        nome
                      )
                    }
                    style={{
                      width:
                        '100%',
                      textAlign:
                        'left',
                      background:
                        connectedDevice ===
                        id
                          ? '#ecfdf5'
                          : '#ffffff',
                      color:
                        '#172033',
                      padding: 17,
                      borderRadius:
                        16,
                      marginBottom:
                        10,
                      border:
                        connectedDevice ===
                        id
                          ? '2px solid #16a34a'
                          : '1px solid #e2e8f0',
                    }}
                  >
                    <strong>
                      {connectedDevice ===
                      id
                        ? '🟢 '
                        : '🔵 '}

                      {nome}
                    </strong>

                    <div
                      style={{
                        marginTop:
                          6,
                        fontSize:
                          12,
                        color:
                          '#64748b',
                        wordBreak:
                          'break-all',
                      }}
                    >
                      {id}
                    </div>

                    <div
                      style={{
                        marginTop:
                          8,
                        fontSize:
                          13,
                        fontWeight:
                          700,
                      }}
                    >
                      {connectedDevice ===
                      id
                        ? 'CONECTADO'
                        : 'Toque para conectar'}
                    </div>
                  </button>
                )
              }
            )}
          </div>
        )}

        {/* PEDIDO RECEBIDO */}

        {pedido && (
          <div
            style={{
              marginTop:
                16,
              background:
                '#ffffff',
              borderRadius:
                22,
              padding: 20,
              boxShadow:
                '0 8px 25px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                fontSize:
                  12,
                fontWeight:
                  700,
                color:
                  '#079FA6',
                textTransform:
                  'uppercase',
              }}
            >
              Pedido recebido
            </div>

            <h2
              style={{
                margin:
                  '8px 0 4px',
                fontSize:
                  21,
              }}
            >
              Pedido #
              {String(
                pedido.numero
              ).padStart(
                3,
                '0'
              )}
            </h2>

            <div
              style={{
                color:
                  '#64748b',
                marginBottom:
                  14,
              }}
            >
              Cliente:{' '}
              {pedido.cliente}
            </div>

            {pedido.itens.map(
              (
                item,
                index
              ) => (
                <div
                  key={index}
                  style={{
                    padding:
                      '10px 0',
                    borderBottom:
                      '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                    }}
                  >
                    <span>
                      {item.quantidade}x{' '}
                      {item.nome}
                    </span>

                    <strong>
                      R${' '}
                      {dinheiro(
                        item.subtotal
                      )}
                    </strong>
                  </div>

                  {item.options && (
                    <div
                      style={{
                        marginTop:
                          4,
                        fontSize:
                          12,
                        color:
                          '#64748b',
                      }}
                    >
                      {item.options}
                    </div>
                  )}
                </div>
              )
            )}

            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                marginTop:
                  16,
                fontSize:
                  19,
              }}
            >
              <strong>
                TOTAL
              </strong>

              <strong>
                R${' '}
                {dinheiro(
                  pedido.total
                )}
              </strong>
            </div>

            <button
              onClick={() =>
                imprimirPedido(
                  pedido
                )
              }
              disabled={
                !connectedDevice ||
                imprimindo
              }
              style={{
                width:
                  '100%',
                marginTop:
                  18,
                padding:
                  '18px 20px',
                border:
                  'none',
                borderRadius:
                  16,
                background:
                  !connectedDevice
                    ? '#cbd5e1'
                    : imprimindo
                    ? '#64748b'
                    : '#16a34a',
                color:
                  '#ffffff',
                fontSize:
                  17,
                fontWeight:
                  800,
              }}
            >
              {imprimindo
                ? '🖨️ Imprimindo...'
                : '🖨️ IMPRIMIR PEDIDO'}
            </button>
          </div>
        )}

        {/* TESTE MANUAL */}

        <div
          style={{
            marginTop:
              16,
            background:
              '#ffffff',
            borderRadius:
              22,
            padding: 20,
          }}
        >
          <strong>
            Teste da impressora
          </strong>

          <p
            style={{
              color:
                '#64748b',
              fontSize:
                13,
              marginTop:
                5,
            }}
          >
            Use este botão para
            verificar se a conexão
            Bluetooth está funcionando.
          </p>

          <button
            onClick={
              imprimirTeste
            }
            disabled={
              !connectedDevice ||
              imprimindo
            }
            style={{
              width:
                '100%',
              marginTop:
                14,
              padding:
                '16px 20px',
              border:
                'none',
              borderRadius:
                16,
              background:
                !connectedDevice
                  ? '#cbd5e1'
                  : '#16a34a',
              color:
                '#ffffff',
              fontSize:
                16,
              fontWeight:
                800,
            }}
          >
            🖨️ TESTAR IMPRESSÃO
          </button>
        </div>

        {/* SUPABASE */}

        <button
          onClick={
            testarSupabase
          }
          style={{
            width:
              '100%',
            marginTop:
              16,
            padding:
              '14px 20px',
            border:
              '1px solid #cbd5e1',
            borderRadius:
              14,
            background:
              '#ffffff',
            color:
              '#334155',
            fontSize:
              14,
            fontWeight:
              700,
          }}
        >
          🔄 Testar conexão com Supabase
        </button>

        <p
          style={{
            textAlign:
              'center',
            color:
              '#94a3b8',
            fontSize:
              12,
            marginTop:
              24,
            lineHeight:
              1.5,
          }}
        >
          Maré de Doçuras
          <br />
          Ponte de impressão Bluetooth
        </p>
      </div>
    </div>
  )
}

export default App