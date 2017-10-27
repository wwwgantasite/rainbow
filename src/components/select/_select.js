import {isArray, inArray, hx, globalClick, getTextWidth} from '../../common/_tools.js'

var RSelect = Vue.extend({
  props: {
    value: [String, Number, Array],
    multiple: Boolean,
    disabled: Boolean,
    clearable: Boolean,
    filterable: Boolean,
    size: String,
    placeholder: {
      type: String,
      default: '请选择',
    },
    notFoundText: {
      type: String,
      default: '无匹配数据', 
    },
  },
  data () {
    return {
      labelValue: [],
      filterLabelValue: [],
      isExpand: false,
      word: null,
      focusIdx: -1,
    }
  },
  computed: {
    cls () {
      var cls = ['r-select']

      if (!this.isMultiple && (this.size === 'small') ){
        cls.push('r-select-small')
      }

      if (this.clearable && !this.disabled){
        cls.push('r-select-clearable')
      }

      if (this.isMultiple){
        cls.push('r-select-multiple')
      }

      if (this.disabled){
        cls.push('r-select-disabled')
      }

      return cls
    },
    isMultiple () {
      return isArray(this.value)
    },
    hasValue () {
      if (this.isMultiple){
        return this.value.length > 0
      }
      else {
        return this.value !== undefined
      }
    },
  },
  methods: {
    _removeValue (_value) {
      var value = [...this.value]
      var idx = value.indexOf(_value)
      value.splice(idx, 1)

      this.$emit('input', value)
    },
    _getInputWidth () {
      if (!this.$el){
        return 50
      }

      var $$input = this.$refs.input
      var style = window.getComputedStyle($$input)
      var width = getTextWidth(this.word || this.placeholder, `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`)

      return Math.min(width + 10, this.$el.getBoundingClientRect().width - 40)
    },
    _getLabelValue () {
      var labelValue = []
      
      this.$slots.default.forEach($slot=>{
        var componentOptions = $slot.componentOptions

        if (componentOptions && (componentOptions.tag === 'r-select-option')){
          var value = componentOptions.propsData.value
          var label = componentOptions.propsData.label
          var disabled = componentOptions.propsData.disabled

          if ( (disabled !== undefined) && (disabled !== false) ){
            disabled = true
          }

          labelValue.push({label, value, disabled})
        }
      })

      return labelValue
    },
    _isSelected (value) {
      if (this.isMultiple){
        return inArray(value, this.value)
      }
      else {
        return this.value === value
      }
    },
    _optionClick (data) {
      if (data.disabled){
        return
      }

      var _value = data.value

      if (this.isMultiple){
        var value = [...this.value]

        if (inArray(_value, this.value)){
          var idx = value.indexOf(_value)

          value.splice(idx, 1)
          this.$emit('input', value)
        }
        else {
          value.push(_value)
          this.$emit('input', value)
        }
      }
      else {
        this.$emit('input', _value)
      }

      this.word = null
      if (this.isMultiple && this.filterable){
        this.$refs.input.focus()
      }
      else {
        this.isExpand = false
      }
    },
    _getSelected (labelValue) {
      var value = this.value
      if (!isArray(value)){
        value = [value]
      }

      var selected = []
      labelValue.forEach(lv=>{
        if (inArray(lv.value, value)){
          selected.push({
            value: lv.value,
            label: lv.label,
          })
        }
      })
      return selected
    },
    _getFilter (labelValue) {
      if (this.word === null){
        return labelValue
      }

      var filter = []
      labelValue.forEach(lv=>{
        if (lv.label.indexOf(this.word) != -1){
          filter.push({
            label: lv.label,
            value: lv.value,
          })
        }
      })
      return filter
    },
    _setScolltop (idx) {
      var $options = []
      this.$children.forEach($child=>{
        if ($child instanceof RSelectOption){
          $options.push($child)
        }
      })

      var $option = $options[idx]

      if (!$option){
        return
      }

      var $$option = $option.$el
      var $$dropdown = this.$refs.dropdown

      var $$optionRect = $$option.getBoundingClientRect()
      var $$dropdownRect = $$dropdown.getBoundingClientRect()

      var bottomOverflowDistance = $$optionRect.bottom - $$dropdownRect.bottom
      var topOverflowDistance = $$optionRect.top - $$dropdownRect.top

      if (bottomOverflowDistance > 0) {
        $$dropdown.scrollTop += bottomOverflowDistance;
      }
      if (topOverflowDistance < 0) {
        $$dropdown.scrollTop += topOverflowDistance;
      }
    },
    _keydown (e) {
      var me = this
      var key = e.key
      
      if (key === 'Backspace'){
        if (me.isMultiple && (me.word === '' || me.word === null) ){
          var _value = me.value[me.value.length - 1]
          me._removeValue(_value)
        }
      }
      else if (inArray(key, ['ArrowDown', 'ArrowUp'])){
        var idx = me.focusIdx
        var minIdx = 0
        var maxIdx = me.filterLabelValue.length - 1
       
        if (key === 'ArrowDown'){
          idx ++
        }
        else if (key === 'ArrowUp'){
          idx --
        }
        idx = Math.min(maxIdx, Math.max(minIdx, idx))

        me.focusIdx = idx
        e.preventDefault()
      }
      else if (key === 'Enter'){
        var data = me.filterLabelValue[me.focusIdx]
        if (data){
          me._optionClick(data)
        }
      }
    },
  },
  watch: {
    isExpand (val) {
      if (!val){
        this.focusIdx = -1
      }
      else {
        var idx = -1
        var values = this.labelValue.map(lv=>{
          return lv.value
        })

        if (this.isMultiple){
          idx = values.indexOf(this.value[0])
        }
        else {
          idx = values.indexOf(this.value)
        }

        this.$nextTick(_=>{
          this._setScolltop(idx)
        })
      }
    },
    focusIdx (val) {
      this._setScolltop(val)
    },
  },
  mounted () {
    globalClick(this.$el, _=>{
      this.isExpand = false
      this.word = null
    })
  },
  render (h) {console.log('select render')
    var me = this
    var labelValue = this.labelValue = this._getLabelValue()
    var filterLabelValue = this.filterLabelValue = this._getFilter(labelValue)
    var $select = hx(`div.${this.cls.join('+')}`)
    
    //- 选择框区域
    var $selection = hx('div.r-select-selection', {
      attrs: {
        // 添加tabindex，使得div可以相应键盘事件
        tabindex: 100,
      },
      on: {
        click () {
          if (me.disabled){
            return
          }

          if (me.isMultiple){
            me.isExpand = true
          }
          else {
            me.isExpand = !me.isExpand
          }

          if (me.filterable){
            me.$nextTick(_=>{
              me.$refs.input.focus()
            })
          }
        },
        keydown : this.filterable ? Function.prototype : this._keydown,
      }
    })

    var selectedLabelValue = this._getSelected(labelValue)
    // 多选tags
    if (this.isMultiple){
      var $tags = selectedLabelValue.map(s=>{
        return hx('r-tag', {
          props: {
            closeable: true,
            name: s.value,
          },
          on: {
            close (e, name) {
              me._removeValue(name)
              e.stopPropagation()
            }
          },
        }, [s.label])
      })

      $selection.push($tags)
    }

    // 输入框
    var inputParams = {
      style: {},
      domProps: {},
      attrs: {
        type: 'text',
      },
      on: {
        input (e) {
          me.word = e.target.value
        },
        keydown : this.filterable ? this._keydown : Function.prototype,
      },
      ref: 'input',
    }

    if (this.isMultiple){
      if (!this.hasValue){
        inputParams.attrs['placeholder'] = this.placeholder
      }

      inputParams.domProps.value = me.word || ''
    }
    else {
      inputParams.attrs['placeholder'] = this.placeholder

      var inputValue = ''
      if (me.word !== null){
        inputValue = me.word
      }
      else {
        if (selectedLabelValue[0]){
          inputValue = selectedLabelValue[0].label
        }
      }

      inputParams.domProps.value = inputValue
    }

    if (this.disabled || !this.filterable){
      inputParams.attrs['readonly'] = 'readonly'
    }
    $selection.push(
      hx('div.r-select-input-wrapper', {
        style: {
          width: this._getInputWidth() + 'px',
          display: (this.isMultiple && this.hasValue && !this.isExpand) ? 'none' : 'inline-block',
        },
      }).push(
        hx('input', inputParams)
      )
    )

    // 箭头
    var arrowIcon
    if (this.isExpand){
      arrowIcon = 'arrow-up-b'
    }
    else {
      arrowIcon = 'arrow-down-b'
    }
    $selection.push(
      hx('r-icon', {
        props: {
          type: arrowIcon,
        },
      })
    )

    // clearable
    if (this.clearable && !this.disabled){
      $selection.push(
        hx('r-icon', {
          props: {
            type: 'ios-close',
          },
          nativeOn: {
            click (e) {
              me.$emit('input', me.isMultiple ? [] : '')
              me.isExpand = false
              e.stopPropagation()
            }
          },
        })
      )
    }

    //- 列表区域
    var dropdownWidth = 10

    if (me.$el){
      dropdownWidth = me.$el.getBoundingClientRect().width
    }
    var $dropdown = hx('div.r-select-dropdown', {
      style: {
        width: dropdownWidth + 'px',
        display: this.isExpand ? 'block' : 'none'
      },
      ref: 'dropdown',
    })
    var $dropdownList = hx('ul.r-select-dropdown-list')

    // 无匹配
    var $notFound = hx('li', {
      style: {
        display: filterLabelValue.length === 0 ? 'block' : 'none',
      },
    }, [this.notFoundText])

    $dropdownList.push($notFound)

    // options
    var $options = filterLabelValue.map((lv, idx) => {
      var params = {
        'class': {
          'r-select-option-selected': this._isSelected(lv.value),
          'r-select-option-focus': this.focusIdx === idx,
        },
        props: {
          label: lv.label,
          value: lv.value,
          disabled: lv.disabled,
        },
        nativeOn: {
          click () {
            me._optionClick(lv)
          }
        },
      }
      return hx('r-select-option', params)
    })

    $dropdownList.push($options)
    $dropdown.push($dropdownList)

    return $select
      .push($selection)
      .push($dropdown)
      .resolve(h)
  }
})

var RSelectOption = Vue.extend({
  props: {
    value: [String, Number],
    label: String,
    disabled: Boolean,
  },
  computed: {
    cls () {
      var cls = ['r-select-option']

      if (this.disabled){
        cls.push('r-select-option-disabled')
      }

      return cls
    },
  },
  render (h) {
    var me = this

    return hx(`li.${this.cls.join('+')}`, {}, [this.label]).resolve(h)
  }
})

Vue.component('r-select', RSelect)
Vue.component('r-select-option', RSelectOption)