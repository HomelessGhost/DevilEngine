class Matrix{
	static createMatrix(rowCnt, columnCnt, fillValue){
		let A = new Array(rowCnt);
		if(!fillValue)
			for(let i=0; i<rowCnt; i++) A[i] = new Array(columnCnt);
		
		else
			for(let i=0; i<rowCnt; i++) A[i] = new Array(columnCnt).fill(fillValue);
		
		return A;
	}


	static transpose(A){
		if( !(A instanceof Array) )
			console.error("Incompatible type of object to transpose");

		let n = A.length;
		let m = A[0].length;
		let A_T = new Array(m);
		for(let i=0; i<m; i++){
			A_T[i] = new Array(n);
			for(let j=0; j<n; j++){
				A_T[i][j] = A[j][i];
			}
		}
		return A_T;
	}

	static inverse(A){
		if( !(A instanceof Array) )
			console.error("Incompatible type of object to inverse");

		let n = A.length;
		let a = new Array(n);
		for(let i=0; i<n;i++) a[i]=new Array(2*n);

		for(let i=0;i<n;i++){
			for(let j=0;j<n;j++){
				a[i][j] = A[i][j];
			}
		}
		for(let i=0;i<n;i++){
			for(let j=n;j<2*n;j++){
				if(i==j-n) a[i][j]=1;
				else       a[i][j]=0;
			}
		}
		for(let i=0;i<n;i++){
			let t=a[i][i];
			for(let j=i;j<2*n;j++)
				a[i][j]=a[i][j]/t;
			for(let j=0;j<n;j++){
				if(i!=j){
					t=a[j][i];
					for(let k=0;k<2*n;k++)
						a[j][k]=a[j][k]-t*a[i][k];
				}
			}
		}
		let Ai = new Array(n);
		for(let i=0; i<n;i++) Ai[i]=new Array(n);
		for(let i=0;i<n;i++){
			for(let j=0;j<n;j++){
				Ai[i][j] = a[i][j+n];
			}
		}
		return Ai;
	}

	static sum(A, B){
		if( !(A instanceof Array) || !(B instanceof Array) )
			console.error("Incompatible type of object to sum");
		if( A.length !== B.length || A[0].length !== B[0].length )
			console.error("Incompatible matrix sizes");

		let C = Matrix.createMatrix(A.length, A[0].length);

		for(let i=0; i<A.length; i++){
			for(let j=0; j<A[0].length; j++){
				C[i][j] = A[i][j] + B[i][j];
			}
		}
		return C;
	}

	static mult(A, B){
		let m = A[0].length;
		let n = B.length;
		let h = A.length;
		let k = B[0].length;
		if(m !== n) console.error("Wrong matrix dimensions");
		let C = new Array(h);
		for(let i=0; i<h; i++) C[i] = new Array(k);

		for(let i=0; i<h; i++){
			for(let j=0; j<k; j++){
				let c_ij = 0;
				for(let k=0; k<n; k++){
					c_ij += A[i][k]*B[k][j];
				}
				C[i][j] = c_ij;
			}
		}
		return C;
	}
}

export { Matrix };