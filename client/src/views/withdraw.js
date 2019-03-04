import { div, h2, span, button, form, input } from '@cycle/dom'
import { formGroup, amountField, fancyCheckbox } from './util'

export const withdraw = ({ amtData, withdrawAll, obalance, unitf, conf: { unit, expert } }) => {
    const availText = obalance != null ? `Available: ${unitf(obalance)}` : ''
  
    return form({ attrs: { do: 'exec-withdraw' } }, [
      h2('On-chain withdraw')
  
    , formGroup('Address', input('.form-control.form-control-lg' , { attrs: {
        name: 'address', required: true } }))
  
    , formGroup('Withdraw Amount', div([
        !withdrawAll
          ? amountField(amtData, 'amount_sat', true, availText)
          : div('.input-group', [
              input({ attrs: { type: 'hidden', name: 'amount_sat', value: 'all' } })
            , input('.form-control.form-control-lg.disabled', { attrs: { disabled: true, placeholder: availText } })
            , div('.input-group-append.toggle-unit', span('.input-group-text', unit))
            ])
      , fancyCheckbox('withdraw-all', 'Withdraw All', withdrawAll, '.btn-sm')
      ]))
  
    , expert ? formGroup('Fee rate', input('.form-control.form-control-lg'
               , { attrs: { type: 'text', name: 'feerate', placeholder: '(optional)'
                          , pattern: '[0-9]+(perk[bw])?|slow|normal|urgent' } })) : ''
  
    , div('.form-buttons', [
        button('.btn.btn-lg.btn-primary', { attrs: { type: 'submit' } }, 'Withdraw')
      ])
    ])
  }